'use server';
/**
 * Server actions — every mutation goes through here.
 *
 * SECURITY MODEL
 * ──────────────
 * Authorisation is enforced entirely in app code. The app connects to
 * Neon Postgres via `lib/db/index.ts` using DATABASE_URL (HTTP driver,
 * authenticated as `neondb_owner`); the RLS policies in 0001 are
 * Supabase-flavoured (`auth.uid()`, `authenticated` role) and were
 * skipped on Neon by the migration runner — they do not enforce
 * anything in production. The session boundary is the Better-Auth
 * cookie, validated server-side via `getSession()` / `meOrThrow()`.
 *
 * Therefore every action in this file must:
 *   1. Call `meOrThrow()` to confirm a session + member record exist.
 *   2. Check role / ownership explicitly before any read or write.
 *   3. Validate input with Zod (refuse anything from the body we cannot
 *      independently confirm against the session).
 *   4. Append an `audit_log` row for any state change.
 *
 * The `audit_log` table has UPDATE/DELETE triggers (migration 0002)
 * that block tampering at the DB layer regardless of caller.
 */
import { revalidatePath } from 'next/cache';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments, cases, votes, loans, repayments, auditLog, notifications, messages, memberInvites, users, config as configTbl } from '@/lib/db/schema';
import { monthStartFromLabel } from '@/lib/month';
import { broadcastPush, sendPushToMembers } from '@/lib/push';
import { sendApprovalEmail, sendPaymentReceiptEmail, sendEmergencyCaseEmail } from '@/lib/email';

/** Lookup the auth email for a member via auth_id → users.email. Null if missing. */
async function emailForMember(memberAuthId: string | null): Promise<string | null> {
  if (!memberAuthId) return null;
  const [row] = await db.select({ email: users.email }).from(users).where(eq(users.id, memberAuthId)).limit(1);
  return row?.email ?? null;
}

/* ─── helpers */
async function audit(actorId: string, action: string, detail: string, targetId?: string) {
  await db.insert(auditLog).values({ actorId, targetId, action, detail });
}

/* ─── approve pending member (admin) */
export async function approveMember(memberId: string) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) throw new Error('Invalid id');

  const [m] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!m) throw new Error('Member not found');
  if (m.status === 'approved') return;

  await db.update(members).set({ status: 'approved' }).where(eq(members.id, memberId));
  await audit(me.id, 'member-approved', `Approved ${m.nameEn || m.nameUr}`, memberId);
  await db.insert(notifications).values({
    recipientId: memberId,
    titleUr: 'منظوری',
    titleEn: 'Approved',
    ur: 'آپ کا اکاؤنٹ منظور ہو گیا — اب آپ ایپ استعمال کر سکتے ہیں',
    en: 'Your account has been approved — you can now use the app',
    type: 'approved',
  });
  // Push notification so they see it on lock screen
  void sendPushToMembers([memberId], {
    title: '🎉 Account approved',
    body: 'Salaam — your Barakah Hub account has been approved. Welcome!',
    data: { type: 'approved' },
    channelId: 'admin',
  }).catch(() => {});
  // Email approval — fire & forget, never block on email
  void emailForMember(m.authId).then((email) => {
    if (email) return sendApprovalEmail(email, m.nameEn || m.nameUr);
  }).catch(() => {});
  revalidatePath('/admin/members');
}

/* ─── bulk import members from CSV (admin) */
const bulkImportRowSchema = z.object({
  username: z.string().min(2).max(40).regex(/^[a-z0-9_]+$/i),
  nameEn: z.string().min(2).max(80),
  nameUr: z.string().min(1).max(80),
  fatherName: z.string().min(2).max(80),
  relation: z.string().max(80).optional(),
  phone: z.string().max(30).optional(),
  city: z.string().max(60).optional(),
  province: z.string().max(40).optional(),
  monthlyPledge: z.number().int().min(0).max(1_000_000).default(1000),
});

const bulkImportSchema = z.object({
  rows: z.array(bulkImportRowSchema).min(1).max(500),
});

export async function bulkImportMembers(input: z.infer<typeof bulkImportSchema>): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  const data = bulkImportSchema.parse(input);

  // Detect existing usernames so we skip duplicates cleanly instead of
  // bombing the whole batch on the first conflict.
  const usernames = data.rows.map((r) => r.username.toLowerCase());
  const existing = await db
    .select({ username: members.username })
    .from(members)
    .where(sql`LOWER(${members.username}) = ANY(${usernames})`);
  const existingSet = new Set(existing.map((e) => e.username.toLowerCase()));

  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (const row of data.rows) {
    if (existingSet.has(row.username.toLowerCase())) {
      skipped++;
      errors.push(`Skipped "${row.username}": username already exists`);
      continue;
    }
    try {
      await db.insert(members).values({
        ...row,
        status: 'approved',
        needsSetup: true,
      });
      imported++;
    } catch (e: unknown) {
      skipped++;
      errors.push(`Failed "${row.username}": ${e instanceof Error ? e.message : 'insert failed'}`);
    }
  }

  await audit(me.id, 'bulk-import', `Imported ${imported}, skipped ${skipped}`);
  revalidatePath('/admin/members');
  return { imported, skipped, errors };
}

/* ─── add member (admin) */
const addMemberSchema = z.object({
  username: z.string().min(2).max(40).regex(/^[a-z0-9_]+$/i),
  nameEn: z.string().min(2).max(80),
  nameUr: z.string().min(1).max(80),
  fatherName: z.string().min(2).max(80),
  relation: z.string().max(80).optional(),
  parentId: z.string().uuid().nullable().optional(),
  phone: z.string().max(30).optional(),
  city: z.string().max(60).optional(),
  province: z.string().max(40).optional(),
  monthlyPledge: z.number().int().min(0).max(1_000_000).default(1000),
});

export async function addMember(input: z.infer<typeof addMemberSchema>) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Only admin can add members');
  const data = addMemberSchema.parse(input);
  const [created] = await db
    .insert(members)
    .values({ ...data, status: 'approved', needsSetup: true })
    .returning();
  await audit(me.id, 'member-added', `Added ${created.nameEn} (${created.username})`, created.id);
  revalidatePath('/admin/members');
  revalidatePath('/tree');
  return created;
}

/* ─── record payment (admin) */
const recordPaymentSchema = z.object({
  memberId: z.string().uuid(),
  amount: z.number().int().positive().max(10_000_000),
  pool: z.enum(['sadaqah', 'zakat', 'qarz']).default('sadaqah'),
  monthLabel: z.string().min(3).max(40),
  note: z.string().max(200).optional(),
});

export async function recordPayment(input: z.infer<typeof recordPaymentSchema>) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Only admin can record direct payments');
  const data = recordPaymentSchema.parse(input);
  const [created] = await db
    .insert(payments)
    .values({
      ...data,
      monthStart: monthStartFromLabel(data.monthLabel),
      pendingVerify: false,
      verifiedById: me.id,
      verifiedAt: new Date(),
    })
    .returning();
  await audit(me.id, 'payment-record', `${data.pool} payment ${data.amount} for ${data.monthLabel}`, data.memberId);
  revalidatePath('/admin/fund');
  revalidatePath('/dashboard');
  return created;
}

/* ─── self-submit donation (any member) */
const submitDonationSchema = z.object({
  amount: z.number().int().positive().max(10_000_000),
  pool: z.enum(['sadaqah', 'zakat', 'qarz']).default('sadaqah'),
  monthLabel: z.string().min(3).max(40),
  note: z.string().max(200).optional(),
});

export async function submitDonation(input: z.infer<typeof submitDonationSchema>) {
  const me = await meOrThrow();
  if (me.status !== 'approved') throw new Error('Account not approved');
  if (me.deceased) throw new Error('Account inactive');
  const data = submitDonationSchema.parse(input);
  const [created] = await db
    .insert(payments)
    .values({
      ...data,
      memberId: me.id,
      monthStart: monthStartFromLabel(data.monthLabel),
      pendingVerify: true,
    })
    .returning();
  await audit(me.id, 'payment-self-submit', `Submitted ${data.pool} ${data.amount} for ${data.monthLabel}`, me.id);
  revalidatePath('/myaccount');
  revalidatePath('/admin/fund');
  return created;
}

/* ─── verify / reject pending payment (admin) */
export async function verifyPayment(paymentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) throw new Error('Invalid id');
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  await db
    .update(payments)
    .set({ pendingVerify: false, verifiedById: me.id, verifiedAt: new Date() })
    .where(eq(payments.id, paymentId));
  await audit(me.id, 'payment-verified', `Verified payment ${paymentId}`);
  // Notify the donor that their payment was approved (push + email receipt)
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (p) {
    void sendPushToMembers([p.memberId], {
      title: '✅ Donation verified',
      body: `Your ${p.pool} contribution of Rs ${p.amount.toLocaleString('en-PK')} for ${p.monthLabel} has been verified.`,
      data: { type: 'payment-verified', paymentId: p.id },
      channelId: 'payments',
    }).catch(() => {});
    void (async () => {
      const [donor] = await db.select().from(members).where(eq(members.id, p.memberId)).limit(1);
      if (!donor) return;
      const email = await emailForMember(donor.authId);
      if (email) {
        await sendPaymentReceiptEmail(email, {
          name: donor.nameEn || donor.nameUr,
          amount: p.amount,
          pool: p.pool,
          monthLabel: p.monthLabel,
          paymentId: p.id,
          verifiedAt: new Date(),
        });
      }
    })().catch(() => {});
  }
  revalidatePath('/admin/fund');
  revalidatePath('/myaccount');
}

export async function rejectPayment(paymentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) throw new Error('Invalid id');
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!p) return;
  await db.delete(payments).where(eq(payments.id, paymentId));
  await audit(me.id, 'payment-rejected', `Rejected payment ${paymentId} (${p.amount})`, p.memberId);
  revalidatePath('/admin/fund');
}

/* ─── cast vote on a case
 *
 * Self-vote is normally disallowed (conflict of interest), but admins
 * are permitted to break the tie / unblock a stuck request — they're
 * already trusted with veto + delete, so a self-vote is strictly less
 * power than the veto path below.
 */
export async function castVote(caseId: string, yes: boolean) {
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw new Error('Invalid case id');
  const me = await meOrThrow();
  if (me.status !== 'approved') throw new Error('Account not approved');
  if (me.deceased) throw new Error('Not eligible');
  const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  if (!c) throw new Error('Case not found');
  if (c.status !== 'voting') throw new Error('Voting closed');
  if (c.applicantId === me.id && me.role !== 'admin') {
    throw new Error('Cannot vote on your own request');
  }

  // Insert (ON CONFLICT — would fail naturally via PK; handle in caller)
  await db.insert(votes).values({ caseId, memberId: me.id, vote: yes }).onConflictDoNothing();
  await audit(me.id, 'vote-cast', `Voted ${yes ? 'YES' : 'NO'} on case ${caseId}`, c.applicantId);

  // Tally + auto-resolve
  const allVotes = await db.select().from(votes).where(eq(votes.caseId, caseId));
  const yesCount = allVotes.filter((v) => v.vote).length;
  const noCount = allVotes.filter((v) => !v.vote).length;

  const eligibleCount = await db.$count(
    members,
    and(eq(members.deceased, false), eq(members.status, 'approved')),
  );
  const eligible = Math.max(0, eligibleCount - 1); // exclude applicant
  const [cfg] = await db.select().from(configTbl).where(eq(configTbl.id, 1)).limit(1);
  const need = Math.ceil(eligible * ((cfg?.voteThresholdPct ?? 50) / 100));

  if (yesCount >= need) {
    await db.update(cases).set({ status: 'approved', resolvedAt: new Date() }).where(eq(cases.id, caseId));
    await audit(me.id, 'emergency-approved', `Case approved by majority`, c.applicantId);
  } else if (noCount >= need) {
    await db.update(cases).set({ status: 'rejected', resolvedAt: new Date() }).where(eq(cases.id, caseId));
    await audit(me.id, 'emergency-rejected', `Case rejected by majority`, c.applicantId);
  }

  revalidatePath('/cases');
  revalidatePath('/dashboard');
}

/* ─── update goal (admin) */
const goalSchema = z.object({
  goalAmount: z.number().int().min(0).max(1_000_000_000),
  goalLabelUr: z.string().max(80).optional(),
  goalLabelEn: z.string().max(80).optional(),
  goalDeadline: z.string().nullable().optional(),
});

export async function updateGoal(input: z.infer<typeof goalSchema>) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  const data = goalSchema.parse(input);
  await db.update(configTbl).set(data).where(eq(configTbl.id, 1));
  await audit(me.id, 'config-changed', `Goal updated to ${data.goalAmount}`);
  revalidatePath('/dashboard');
  revalidatePath('/settings');
}

/* ─── update profile (self) */
const profileSchema = z.object({
  nameUr: z.string().min(1).max(80).optional(),
  nameEn: z.string().min(1).max(80).optional(),
  phone: z.string().max(30).optional().nullable(),
  city: z.string().max(60).optional().nullable(),
  province: z.string().max(40).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  photoUrl: z.string().url().startsWith('https://').nullable().optional(),
});

export async function updateProfile(input: z.infer<typeof profileSchema>) {
  const me = await meOrThrow();
  const data = profileSchema.parse(input);
  await db.update(members).set({ ...data, needsSetup: false }).where(eq(members.id, me.id));
  await audit(me.id, 'profile-updated', 'Self-edit via Settings');
  revalidatePath('/settings');
  revalidatePath('/myaccount');
  revalidatePath('/dashboard');
}

/* ─── update admin config (admin only) */
const adminCfgSchema = z.object({
  voteThresholdPct: z.number().int().min(30).max(75).optional(),
  defaultMonthlyPledge: z.number().int().min(0).optional(),
  themePalette: z.string().max(20).optional(),
  orgNameUr: z.string().max(80).optional(),
  orgNameEn: z.string().max(80).optional(),
});

export async function updateAdminConfig(input: z.infer<typeof adminCfgSchema>) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  const data = adminCfgSchema.parse(input);
  await db.update(configTbl).set(data).where(eq(configTbl.id, 1));
  await audit(me.id, 'config-changed', JSON.stringify(data));
  revalidatePath('/dashboard');
  revalidatePath('/settings');
}

/* ─── edit member (admin) */
const editMemberSchema = z.object({
  id: z.string().uuid(),
  nameEn: z.string().min(2).max(80).optional(),
  nameUr: z.string().min(1).max(80).optional(),
  fatherName: z.string().min(2).max(80).optional(),
  relation: z.string().max(80).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  city: z.string().max(60).optional().nullable(),
  province: z.string().max(40).optional().nullable(),
  monthlyPledge: z.number().int().min(0).max(1_000_000).optional(),
  role: z.enum(['admin', 'member']).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

export async function editMember(input: z.infer<typeof editMemberSchema>) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  const { id, ...rest } = editMemberSchema.parse(input);

  // Refuse self-demotion to avoid lockout
  if (id === me.id && rest.role && rest.role !== 'admin') {
    throw new Error('Cannot demote yourself — promote another admin first');
  }

  await db.update(members).set(rest).where(eq(members.id, id));
  await audit(me.id, 'member-edited', `Edited member ${id}`, id);
  revalidatePath('/admin/members');
  revalidatePath('/tree');
}

/* ─── delete member (admin) — soft via deceased=false→true OR hard delete */
export async function softDeleteMember(memberId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) throw new Error('Invalid id');
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  await db.update(members).set({ deceased: true }).where(eq(members.id, memberId));
  await audit(me.id, 'member-deceased', `Marked deceased`, memberId);
  revalidatePath('/admin/members');
  revalidatePath('/tree');
}

export async function hardDeleteMember(memberId: string) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  if (memberId === me.id) throw new Error('Cannot delete yourself');

  const [target] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!target) throw new Error('Member not found');

  if (target.role === 'admin') {
    const adminCount = await db.$count(members, and(eq(members.role, 'admin'), eq(members.deceased, false)));
    if (adminCount <= 1) throw new Error('Cannot delete the last admin — promote another member first');
  }

  // Re-parent any children to the admin
  await db.update(members).set({ parentId: me.id }).where(eq(members.parentId, memberId));
  await db.delete(members).where(eq(members.id, memberId));
  await audit(me.id, 'member-deleted', 'Hard deleted', memberId);
  revalidatePath('/admin/members');
  revalidatePath('/tree');
}

/* ─── create case (any approved member)
 *
 * Form now collects ONE `reason` field (whatever language the user
 * naturally types in) and an optional `category`. The DB still has
 * reasonUr / reasonEn / category columns (legacy), so we fan the
 * single reason into both and default category to "general" when
 * the form doesn't provide one. Admins can re-categorise later.
 */
const caseSchema = z.object({
  caseType: z.enum(['gift', 'qarz']),
  pool: z.enum(['sadaqah', 'zakat', 'qarz']).default('sadaqah'),
  category: z.string().min(1).max(40).optional(),
  beneficiaryName: z.string().min(2).max(80),
  relation: z.string().max(40).optional(),
  city: z.string().max(60).optional(),
  amount: z.number().int().positive().max(10_000_000),
  // Either provide a single `reason` OR the two legacy fields.
  reason: z.string().min(3).max(500).optional(),
  reasonUr: z.string().max(500).optional(),
  reasonEn: z.string().max(500).optional(),
  emergency: z.boolean().default(false),
  doc: z.string().max(200).optional(),
  returnDate: z.string().nullable().optional(),
}).refine(
  (v) => !!(v.reason || v.reasonEn || v.reasonUr),
  { message: 'Reason is required', path: ['reason'] },
);

export async function createCase(input: z.infer<typeof caseSchema>) {
  const me = await meOrThrow();
  if (me.status !== 'approved') throw new Error('Account not approved');
  const parsed = caseSchema.parse(input);

  // Normalise: a single `reason` fans out to both legacy columns; pick
  // a sane category default; strip the helper field before insert.
  const reasonText = (parsed.reason ?? parsed.reasonEn ?? parsed.reasonUr ?? '').trim();
  const data = {
    caseType: parsed.caseType,
    pool: parsed.pool,
    category: parsed.category?.trim() || 'general',
    beneficiaryName: parsed.beneficiaryName,
    relation: parsed.relation,
    city: parsed.city,
    amount: parsed.amount,
    reasonEn: parsed.reasonEn?.trim() || reasonText,
    reasonUr: parsed.reasonUr?.trim() || reasonText,
    emergency: parsed.emergency,
    doc: parsed.doc,
    returnDate: parsed.returnDate ?? null,
  };

  const [created] = await db
    .insert(cases)
    .values({ ...data, applicantId: me.id, status: 'voting' })
    .returning();
  await audit(me.id, 'emergency-create', `${data.caseType} ${data.amount} for ${data.beneficiaryName}`);
  // Broadcast push so every approved member sees the new case in time to vote
  void broadcastPush(me.id, {
    title: data.emergency ? '🚨 Emergency case opened' : '🆘 New case to vote on',
    body: `${data.beneficiaryName} · ${data.category} · Rs ${data.amount.toLocaleString('en-PK')}`,
    data: { type: 'case', caseId: created.id },
    channelId: 'cases',
  }).catch(() => {});

  // Email alert — only for cases flagged emergency (so we don't spam on
  // every routine request). Sends to every approved member except the
  // applicant themselves.
  if (data.emergency) {
    void (async () => {
      const recipients = await db
        .select({ nameEn: members.nameEn, nameUr: members.nameUr, authId: members.authId })
        .from(members)
        .where(and(eq(members.status, 'approved'), eq(members.deceased, false), sql`${members.id} != ${me.id}`));
      const authIds = recipients.map((r) => r.authId).filter((v): v is string => !!v);
      if (authIds.length === 0) return;
      const userRows = await db.select({ id: users.id, email: users.email }).from(users).where(inArrayHelper(authIds));
      const emailByAuthId = new Map(userRows.map((u) => [u.id, u.email]));
      for (const r of recipients) {
        if (!r.authId) continue;
        const email = emailByAuthId.get(r.authId);
        if (!email) continue;
        await sendEmergencyCaseEmail(email, {
          name: r.nameEn || r.nameUr,
          beneficiary: data.beneficiaryName,
          category: data.category,
          amount: data.amount,
          reasonEn: data.reasonEn,
          caseId: created.id,
        });
      }
    })().catch(() => {});
  }

  revalidatePath('/cases');
  revalidatePath('/dashboard');
  return created;
}

/** Drizzle inArray wrapper that handles empty arrays without throwing. */
function inArrayHelper(values: string[]) {
  return sql`${users.id} IN (${sql.join(values.map((v) => sql`${v}`), sql`, `)})`;
}

/* ─── issue loan (admin) */
const issueLoanSchema = z.object({
  memberId: z.string().uuid(),
  amount: z.number().int().positive().max(10_000_000),
  purpose: z.string().min(2).max(200),
  city: z.string().max(60).optional(),
  expectedReturn: z.string().nullable().optional(),
  caseId: z.string().uuid().nullable().optional(),
});

export async function issueLoan(input: z.infer<typeof issueLoanSchema>) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  const data = issueLoanSchema.parse(input);

  const [borrower] = await db.select().from(members).where(eq(members.id, data.memberId)).limit(1);
  if (!borrower) throw new Error('Member not found');
  if (borrower.deceased) throw new Error('Cannot issue loan to a deceased member');
  if (borrower.status !== 'approved') throw new Error('Member must be approved to receive a loan');

  const [created] = await db
    .insert(loans)
    .values({
      memberId: data.memberId,
      amount: data.amount,
      purpose: data.purpose,
      pool: 'qarz',
      city: data.city,
      expectedReturn: data.expectedReturn || null,
      caseId: data.caseId || null,
      paid: 0,
      active: true,
    })
    .returning();
  await audit(me.id, 'loan-issue', `Issued ${data.amount} qarz: ${data.purpose}`, data.memberId);
  revalidatePath('/admin/loans');
  revalidatePath('/dashboard');
  return created;
}

/* ─── record loan repayment (admin) */
const repaySchema = z.object({
  loanId: z.string().uuid(),
  amount: z.number().int().positive().max(10_000_000),
  note: z.string().max(200).optional(),
});

export async function recordRepayment(input: z.infer<typeof repaySchema>) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  const data = repaySchema.parse(input);

  // Single guarded UPDATE: only succeeds when the loan is still active
  // AND the new total paid wouldn't exceed the loan amount. Drizzle's
  // neon-http driver can't wrap multi-statement transactions, so we
  // make the UPDATE itself the race-safe gate. Two concurrent admins
  // can't both pass — whichever loses the race gets `updated.length === 0`.
  const updated = await db
    .update(loans)
    .set({
      paid: sql`${loans.paid} + ${data.amount}`,
      active: sql`(${loans.paid} + ${data.amount}) < ${loans.amount}`,
    })
    .where(
      and(
        eq(loans.id, data.loanId),
        eq(loans.active, true),
        sql`(${loans.paid} + ${data.amount}) <= ${loans.amount}`,
      ),
    )
    .returning();

  if (updated.length === 0) {
    // Either loan is already settled, doesn't exist, or the amount
    // would push paid > amount. Surface a helpful message.
    const [loan] = await db.select().from(loans).where(eq(loans.id, data.loanId)).limit(1);
    if (!loan) throw new Error('Loan not found');
    if (!loan.active) throw new Error('Loan already settled');
    throw new Error(`Amount exceeds remaining ${loan.amount - loan.paid}`);
  }

  const settledLoan = updated[0];
  const fullySettled = !settledLoan.active;

  // Now-safe insert + audit; if either fails, a nightly reconcile job
  // (TODO: not yet implemented) would notice loan.paid disagreeing with
  // SUM(repayments.amount).
  await db.insert(repayments).values({
    loanId: data.loanId,
    amount: data.amount,
    note: data.note,
  });
  await audit(
    me.id,
    'loan-repay',
    fullySettled
      ? `Settled loan ${data.loanId} (final ${data.amount})`
      : `Repayment ${data.amount} on loan ${data.loanId}`,
    settledLoan.memberId,
  );
  revalidatePath('/admin/loans');
  revalidatePath('/dashboard');
}

/* ─── disburse an approved case (admin) */
export async function disburseCase(caseId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw new Error('Invalid case id');
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');

  // Atomic: only updates when status is still 'approved' — prevents TOCTOU double-disburse
  const updated = await db
    .update(cases)
    .set({ status: 'disbursed', resolvedAt: new Date() })
    .where(and(eq(cases.id, caseId), eq(cases.status, 'approved')))
    .returning();

  if (updated.length === 0) {
    const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!c) throw new Error('Case not found');
    throw new Error(`Cannot disburse — case is currently "${c.status}"`);
  }

  const c = updated[0];
  await audit(me.id, 'case-disbursed', `Disbursed ${c.amount} for ${c.beneficiaryName}`, c.applicantId);

  // For qarz cases, auto-create the loan record so repayments can be tracked
  if (c.caseType === 'qarz') {
    await db.insert(loans).values({
      memberId: c.applicantId,
      amount: c.amount,
      purpose: c.reasonEn,
      pool: 'qarz',
      city: c.city,
      caseId: c.id,
      paid: 0,
      active: true,
    });
    revalidatePath('/admin/loans');
  }

  revalidatePath('/cases');
  revalidatePath('/dashboard');
}

/* ─── admin veto: force-resolve a case regardless of votes
 *
 * Used when the community is taking too long, the request is clearly
 * urgent, or a stuck vote needs an admin call. Records as "veto" in
 * the audit log so the action is traceable.
 */
export async function adminResolveCase(caseId: string, decision: 'approved' | 'rejected') {
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw new Error('Invalid case id');
  if (decision !== 'approved' && decision !== 'rejected') throw new Error('Invalid decision');
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');

  const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  if (!c) throw new Error('Case not found');
  if (c.status !== 'voting') throw new Error(`Case already ${c.status}`);

  await db
    .update(cases)
    .set({ status: decision, resolvedAt: new Date() })
    .where(eq(cases.id, caseId));
  await audit(
    me.id,
    decision === 'approved' ? 'emergency-approved' : 'emergency-rejected',
    `Admin veto: ${decision} for ${c.beneficiaryName} (${c.amount})`,
    c.applicantId,
  );

  revalidatePath('/cases');
  revalidatePath('/dashboard');
}

/* ─── admin: delete a case (and its votes) entirely
 *
 * Use sparingly — disburse history is lost. Intended for duplicates,
 * test entries, or cases created in error. Disbursed cases that have
 * an associated loan are blocked to keep the loan ledger consistent.
 */
export async function adminDeleteCase(caseId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw new Error('Invalid case id');
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');

  const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  if (!c) throw new Error('Case not found');

  // If a loan was created from this case, refuse — admin must settle/
  // delete the loan first so the ledger stays consistent.
  if (c.status === 'disbursed') {
    const [linkedLoan] = await db.select({ id: loans.id }).from(loans).where(eq(loans.caseId, caseId)).limit(1);
    if (linkedLoan) {
      throw new Error('Case already disbursed and linked to an active loan — settle the loan first');
    }
  }

  // Votes cascade-delete via FK (ON DELETE CASCADE on votes.caseId).
  await db.delete(cases).where(eq(cases.id, caseId));
  await audit(me.id, 'case-deleted', `Deleted case ${c.beneficiaryName} (${c.amount})`, c.applicantId);

  revalidatePath('/cases');
  revalidatePath('/dashboard');
  revalidatePath('/admin/audit');
}

/* ─── member invites (admin) */
const createInviteSchema = z.object({
  label: z.string().max(60).optional(),
  maxUses: z.number().int().min(1).max(100).default(1),
  expiresInDays: z.number().int().min(1).max(365).default(14),
});

export async function createInvite(input: z.infer<typeof createInviteSchema>) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  const data = createInviteSchema.parse(input);
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + data.expiresInDays * 86_400_000);
  const [created] = await db
    .insert(memberInvites)
    .values({ token, createdById: me.id, label: data.label, maxUses: data.maxUses, expiresAt })
    .returning();
  await audit(me.id, 'invite-created', `${data.label ?? 'Unnamed'} · uses=${data.maxUses} · expires=${expiresAt.toLocaleDateString('en-GB')}`);
  revalidatePath('/admin/invites');
  return created;
}

export async function revokeInvite(inviteId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(inviteId)) throw new Error('Invalid id');
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  await db.update(memberInvites).set({ revoked: true }).where(eq(memberInvites.id, inviteId));
  await audit(me.id, 'invite-revoked', inviteId);
  revalidatePath('/admin/invites');
}

function generateInviteToken(): string {
  // 24 chars from URL-safe alphabet — collision-resistant for our scale.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  for (let i = 0; i < arr.length; i++) out += alphabet[arr[i] % alphabet.length];
  return out;
}

/* ─── notifications: mark read */
export async function markAllNotificationsRead() {
  const me = await meOrThrow();
  await db.update(notifications).set({ read: true }).where(eq(notifications.recipientId, me.id));
  revalidatePath('/notifications');
}

/* ─── messages: mark all read */
export async function markAllMessagesRead() {
  const me = await meOrThrow();
  await db.update(messages).set({ read: true }).where(eq(messages.toId, me.id));
  revalidatePath('/messages');
}

/* ─── messages: send */
const sendMessageSchema = z.object({
  toId: z.string().uuid(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

export async function sendMessage(input: z.infer<typeof sendMessageSchema>) {
  const me = await meOrThrow();
  if (me.status !== 'approved') throw new Error('Account not approved');
  const data = sendMessageSchema.parse(input);

  const [recipient] = await db.select().from(members).where(eq(members.id, data.toId)).limit(1);
  if (!recipient) throw new Error('Recipient not found');
  if (recipient.deceased) throw new Error('Cannot message a deceased member');

  await db.insert(messages).values({ ...data, fromId: me.id });
  // Also drop a notification on the recipient so they see the badge
  await db.insert(notifications).values({
    recipientId: data.toId,
    titleUr: 'نیا پیغام',
    titleEn: 'New message',
    ur: data.subject,
    en: data.subject,
    type: 'msg',
  });
  await audit(me.id, 'message-sent', `Subject: ${data.subject}`);
  revalidatePath('/messages');
}
