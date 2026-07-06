'use server';
/**
 * Server actions · every mutation goes through here.
 *
 * SECURITY MODEL
 * ──────────────
 * Authorisation is enforced entirely in app code. The app connects to
 * Neon Postgres via `lib/db/index.ts` using DATABASE_URL (HTTP driver,
 * authenticated as `neondb_owner`); the RLS policies in 0001 are
 * Supabase-flavoured (`auth.uid()`, `authenticated` role) and were
 * skipped on Neon by the migration runner · they do not enforce
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
import { eq, and, sql, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments, cases, votes, loans, repayments, auditLog, notifications, messages, memberInvites, users, config as configTbl } from '@/lib/db/schema';
import { monthStartFromLabel } from '@/lib/month';
import { broadcastPush, sendPushToMembers } from '@/lib/push';
import { notifyMembers as notify, fundApproverIds, adminIds, emailFundApprovers } from '@/lib/notify';
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
    ur: 'آپ کا اکاؤنٹ منظور ہو گیا · اب آپ ایپ استعمال کر سکتے ہیں',
    en: 'Your account has been approved · you can now use the app',
    type: 'approved',
  });
  // Push notification so they see it on lock screen
  void sendPushToMembers([memberId], {
    title: '🎉 Account approved',
    body: 'Salaam · your Barakah Hub account has been approved. Welcome!',
    data: { type: 'approved' },
    channelId: 'admin',
  }).catch((err) => { console.error('[push] approve member:', err); });
  // Email approval · fire & forget, never block on email
  void emailForMember(m.authId).then((email) => {
    if (email) return sendApprovalEmail(email, m.nameEn || m.nameUr);
  }).catch((err) => { console.error('[email] approve member:', err); });
  revalidatePath('/admin/members');
}

/* ─── reject pending member (admin) */
export async function rejectMember(memberId: string) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) throw new Error('Invalid id');

  const [m] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!m) throw new Error('Member not found');
  if (m.status === 'rejected') return;

  await db.update(members).set({ status: 'rejected' }).where(eq(members.id, memberId));
  await audit(me.id, 'member-rejected', `Rejected ${m.nameEn || m.nameUr}`, memberId);
  await db.insert(notifications).values({
    recipientId: memberId,
    titleEn: 'Application not approved',
    titleUr: 'درخواست منظور نہیں ہوئی',
    en: 'Your membership application was not approved at this time. Please contact the administrator for details.',
    ur: 'آپ کی رکنیت کی درخواست اس وقت منظور نہیں ہوئی۔ تفصیل کے لیے ایڈمن سے رابطہ کریں۔',
    type: 'rejected',
  });
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
  const existing = usernames.length
    ? await db
        .select({ username: members.username })
        .from(members)
        .where(sql`LOWER(${members.username}) = ANY(${usernames})`)
    : [];
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
  fatherDeceased: z.boolean().optional(),
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

/* ─── record payment (admin / supervisor)
 *
 * Per user requirement: EVERY donation flows through the supervisor
 * approval queue first, even admin-recorded ones, so a single human
 * eye (the fund collector) confirms cash receipt before money lands
 * in the verified pool. Admin can still verify directly afterwards.
 *
 * Behavior:
 *   - pendingVerify = true (lands in /admin/fund approval queue)
 *   - supervisor_approved_at = NULL (awaiting supervisor)
 *   - actor recorded in audit log so we know who entered the row
 */
const recordPaymentSchema = z.object({
  memberId: z.string().uuid(),
  amount: z.number().int().positive().max(10_000_000),
  pool: z.enum(['sadaqah', 'zakat', 'qarz']).default('sadaqah'),
  monthLabel: z.string().min(3).max(40),
  note: z.string().max(200).optional(),
});

export async function recordPayment(input: z.infer<typeof recordPaymentSchema>) {
  const me = await meOrThrow();
  if (me.role !== 'admin' && me.role !== 'supervisor') {
    throw new Error('Only admin or supervisor can record payments');
  }
  const data = recordPaymentSchema.parse(input);
  const [created] = await db
    .insert(payments)
    .values({
      ...data,
      monthStart: monthStartFromLabel(data.monthLabel),
      pendingVerify: true,
    })
    .returning();
  await audit(
    me.id,
    'payment-record',
    `Recorded ${data.pool} ${data.amount} for ${data.monthLabel} · awaiting supervisor approval`,
    data.memberId,
  );
  await notify(
    await fundApproverIds(me.id),
    {
      titleEn: 'New payment to review', titleUr: 'نئی ادائیگی برائے منظوری',
      en: `A ${data.pool} payment of Rs ${data.amount.toLocaleString('en-PK')} for ${data.monthLabel} is awaiting approval.`,
      ur: `${data.monthLabel} کے لیے روپے ${data.amount.toLocaleString('en-PK')} (${data.pool}) منظوری کے منتظر ہے۔`,
      type: 'payment-pending',
    },
    { title: '🧾 New payment to review', body: `Rs ${data.amount.toLocaleString('en-PK')} ${data.pool}`, data: { type: 'payment-pending' }, channelId: 'payments' },
  );
  void (async () => {
    const [m] = await db.select().from(members).where(eq(members.id, data.memberId)).limit(1);
    await emailFundApprovers(
      { memberName: m?.nameEn || m?.nameUr || 'A member', amount: data.amount, pool: data.pool, monthLabel: data.monthLabel, note: data.note },
      me.id,
    );
  })().catch((err) => { console.error('[email] payment review:', err); });
  revalidatePath('/admin/fund');
  revalidatePath('/dashboard');
  return created;
}

/* ─── self-submit donation (any member)
 * Members may self-submit Sadaqah/Zakat only · the qarz pool is disbursed
 * by admins, never self-credited. Matches /api/payments/submit. */
const submitDonationSchema = z.object({
  amount: z.number().int().positive().max(10_000_000),
  pool: z.enum(['sadaqah', 'zakat']).default('sadaqah'),
  monthLabel: z.string().min(3).max(40),
  note: z.string().max(200).optional(),
  // https-only · matches /api/payments/submit
  receiptUrl: z.string().url().startsWith('https://').or(z.string().startsWith('/uploads/')).optional(),
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
  // Notify fund approvers (supervisors + admins) so the approval queue
  // doesn't sit unseen.
  await notify(
    await fundApproverIds(me.id),
    {
      titleEn: 'New payment to review', titleUr: 'نئی ادائیگی برائے منظوری',
      en: `${me.nameEn || me.nameUr} submitted Rs ${data.amount.toLocaleString('en-PK')} (${data.pool}) for ${data.monthLabel}.`,
      ur: `${me.nameUr || me.nameEn} نے ${data.monthLabel} کے لیے روپے ${data.amount.toLocaleString('en-PK')} (${data.pool}) جمع کیے۔`,
      type: 'payment-pending',
    },
    {
      title: '🧾 New payment to review',
      body: `${me.nameEn || me.nameUr} · Rs ${data.amount.toLocaleString('en-PK')} ${data.pool}`,
      data: { type: 'payment-pending' }, channelId: 'payments',
    },
  );
  void emailFundApprovers(
    { memberName: me.nameEn || me.nameUr, amount: data.amount, pool: data.pool, monthLabel: data.monthLabel, note: data.note, receiptUrl: data.receiptUrl },
    me.id,
  ).catch((err) => { console.error('[email] payment review:', err); });
  revalidatePath('/myaccount');
  revalidatePath('/admin/fund');
  revalidatePath('/dashboard');
  return created;
}

/* ─── supervisor approve (intermediate · admin still needs to verify) */
export async function supervisorApprovePayment(paymentId: string) {
  const me = await meOrThrow();
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) throw new Error('Invalid id');
  if (me.role !== 'supervisor' && me.role !== 'admin') {
    throw new Error('Supervisor or admin only');
  }
  // Approval clears any prior rejection in case admin resent.
  const updated = await db
    .update(payments)
    .set({
      supervisorApprovedAt: new Date(),
      supervisorApprovedById: me.id,
      supervisorRejectedAt: null,
      supervisorRejectedById: null,
      supervisorRejectionNote: null,
    })
    .where(and(
      eq(payments.id, paymentId),
      eq(payments.pendingVerify, true),
      isNull(payments.supervisorApprovedAt),
    ))
    .returning();
  if (updated.length === 0) throw new Error('Payment not found or already verified');
  await audit(
    me.id,
    'payment-supervisor-approved',
    `Approved Rs ${updated[0].amount} ${updated[0].pool} · pending admin final verification`,
    updated[0].memberId,
  );
  await notify(
    await adminIds(me.id),
    {
      titleEn: 'Payment ready to verify', titleUr: 'ادائیگی برائے تصدیق تیار',
      en: `A ${updated[0].pool} payment of Rs ${updated[0].amount.toLocaleString('en-PK')} was approved by the supervisor · awaiting your final verification.`,
      ur: `سپروائزر نے روپے ${updated[0].amount.toLocaleString('en-PK')} (${updated[0].pool}) کی منظوری دی · آپ کی حتمی تصدیق درکار ہے۔`,
      type: 'payment-awaiting-admin',
    },
    { title: '✅ Payment ready to verify', body: `Rs ${updated[0].amount.toLocaleString('en-PK')} ${updated[0].pool}`, data: { type: 'payment-awaiting-admin' }, channelId: 'payments' },
  );
  revalidatePath('/admin/fund');
}

/* ─── supervisor reject (admin must decide: resend or delete) */
export async function supervisorRejectPayment(paymentId: string, note?: string) {
  const me = await meOrThrow();
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) throw new Error('Invalid id');
  if (me.role !== 'supervisor' && me.role !== 'admin') {
    throw new Error('Supervisor or admin only');
  }
  const trimmedNote = note?.trim().slice(0, 500) || null;
  const updated = await db
    .update(payments)
    .set({
      supervisorRejectedAt: new Date(),
      supervisorRejectedById: me.id,
      supervisorRejectionNote: trimmedNote,
      // Clear any prior approval in case supervisor changes mind.
      supervisorApprovedAt: null,
      supervisorApprovedById: null,
    })
    .where(and(
      eq(payments.id, paymentId),
      eq(payments.pendingVerify, true),
    ))
    .returning();
  if (updated.length === 0) throw new Error('Payment not found or already verified');
  await audit(
    me.id,
    'payment-supervisor-rejected',
    `Rejected Rs ${updated[0].amount} ${updated[0].pool}${trimmedNote ? ` · ${trimmedNote}` : ''}`,
    updated[0].memberId,
  );
  await notify(
    await adminIds(me.id),
    {
      titleEn: 'Payment rejected by supervisor', titleUr: 'سپروائزر نے ادائیگی مسترد کی',
      en: `A ${updated[0].pool} payment of Rs ${updated[0].amount.toLocaleString('en-PK')} was rejected${trimmedNote ? `: ${trimmedNote}` : ''}. Resend or delete it.`,
      ur: `روپے ${updated[0].amount.toLocaleString('en-PK')} (${updated[0].pool}) مسترد${trimmedNote ? `: ${trimmedNote}` : ''} · دوبارہ بھیجیں یا حذف کریں۔`,
      type: 'payment-rejected',
    },
    { title: '⛔ Payment rejected', body: `Rs ${updated[0].amount.toLocaleString('en-PK')} ${updated[0].pool} · needs your action`, data: { type: 'payment-rejected' }, channelId: 'payments' },
  );
  revalidatePath('/admin/fund');
}

/* ─── admin resend rejected payment back to supervisor */
export async function adminResendPaymentToSupervisor(paymentId: string) {
  const me = await meOrThrow();
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) throw new Error('Invalid id');
  if (me.role !== 'admin') throw new Error('Admin only');
  const updated = await db
    .update(payments)
    .set({
      supervisorRejectedAt: null,
      supervisorRejectedById: null,
      supervisorRejectionNote: null,
      supervisorApprovedAt: null,
      supervisorApprovedById: null,
    })
    .where(and(
      eq(payments.id, paymentId),
      eq(payments.pendingVerify, true),
    ))
    .returning();
  if (updated.length === 0) throw new Error('Payment not found or already verified');
  await audit(
    me.id,
    'payment-resent-to-supervisor',
    `Resent Rs ${updated[0].amount} ${updated[0].pool} back to supervisor for re-approval`,
    updated[0].memberId,
  );
  revalidatePath('/admin/fund');
}

/* ─── admin hard-delete payment (any state) */
export async function adminDeletePayment(paymentId: string) {
  const me = await meOrThrow();
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) throw new Error('Invalid id');
  if (me.role !== 'admin') throw new Error('Admin only');
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!p) return;
  await db.delete(payments).where(eq(payments.id, paymentId));
  await audit(
    me.id,
    'payment-deleted',
    `Deleted Rs ${p.amount} ${p.pool} for ${p.monthLabel}`,
    p.memberId,
  );
  revalidatePath('/admin/fund');
}

/* ─── verify / reject pending payment (admin)
 *
 * Per workflow: cash is physically with the supervisor, so final verification
 * requires the supervisor to have approved. If supervisor rejected, admin
 * must either resend (adminResendPaymentToSupervisor) or delete
 * (adminDeletePayment) · they can't override the rejection here.
 */
export async function verifyPayment(paymentId: string) {
  const me = await meOrThrow();
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) throw new Error('Invalid id');
  if (me.role !== 'admin') throw new Error('Admin only');

  const [existing] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!existing) throw new Error('Payment not found');
  if (!existing.pendingVerify) throw new Error('Already verified');
  if (!existing.supervisorApprovedAt) {
    throw new Error('Supervisor must approve this payment first before admin can verify.');
  }
  if (existing.supervisorRejectedAt) {
    throw new Error('Supervisor rejected this payment · resend it for re-approval first, or delete it.');
  }

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
    }).catch((err) => { console.error('[push] payment verified:', err); });
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
    })().catch((err) => { console.error('[email] payment receipt:', err); });
  }
  revalidatePath('/admin/fund');
  revalidatePath('/myaccount');
}

/* ─── cast vote on a case
 *
 * Self-vote is normally disallowed (conflict of interest), but admins
 * are permitted to break the tie / unblock a stuck request · they're
 * already trusted with veto + delete, so a self-vote is strictly less
 * power than the veto path below.
 */
export async function castVote(caseId: string, yes: boolean) {
  const me = await meOrThrow();
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw new Error('Invalid case id');
  if (me.status !== 'approved') throw new Error('Account not approved');
  if (me.deceased) throw new Error('Not eligible');
  const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  if (!c) throw new Error('Case not found');
  if (c.status !== 'voting') throw new Error('Voting closed');
  if (c.applicantId === me.id && me.role !== 'admin') {
    throw new Error('Cannot vote on your own request');
  }

  // Insert (ON CONFLICT · would fail naturally via PK; handle in caller)
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
  // Require at least one vote, and never auto-resolve when there are no other
  // eligible voters (otherwise need=0 would approve a case on its first vote —
  // even a NO · with zero real consensus).
  const need = Math.max(1, Math.ceil(eligible * ((cfg?.voteThresholdPct ?? 50) / 100)));

  if (eligible > 0 && yesCount >= need) {
    await db.update(cases).set({ status: 'approved', resolvedAt: new Date() }).where(and(eq(cases.id, caseId), eq(cases.status, 'voting')));
    await audit(me.id, 'emergency-approved', `Case approved by majority`, c.applicantId);
  } else if (eligible > 0 && noCount >= need) {
    await db.update(cases).set({ status: 'rejected', resolvedAt: new Date() }).where(and(eq(cases.id, caseId), eq(cases.status, 'voting')));
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
  revalidatePath('/admin/annual-report');
}

/* ─── update profile (self) */
// Name and father fields are intentionally excluded · only admins can change
// those via editMember to prevent members from spoofing their identity.
const profileSchema = z.object({
  phone: z.string().max(30).optional().nullable(),
  city: z.string().max(60).optional().nullable(),
  province: z.string().max(40).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  photoUrl: z.string()
    .refine(v => !v || v.startsWith('https://') || v.startsWith('/uploads/'), 'Invalid photo URL')
    .nullable()
    .optional(),
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
  easyPaiseName: z.string().max(80).optional().nullable(),
  easyPaiseNumber: z.string().max(20).optional().nullable(),
  goalAmount: z.number().int().min(0).max(1_000_000_000).optional(),
  goalLabelEn: z.string().max(80).optional().nullable(),
  goalLabelUr: z.string().max(80).optional().nullable(),
  goalDeadline: z.string().nullable().optional(),
  // Fauti (death-benefit) payout amount. 0 disables the workflow.
  fautiAmount: z.number().int().min(0).max(100_000_000).optional(),
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
  // min(1) so "—" placeholder (1 char em-dash) doesn't fail validation;
  // the dialog sends undefined if the field is empty, so min(1) is the floor.
  fatherName: z.string().min(1).max(80).optional(),
  fatherDeceased: z.boolean().optional(),
  relation: z.string().max(80).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  city: z.string().max(60).optional().nullable(),
  province: z.string().max(40).optional().nullable(),
  monthlyPledge: z.number().int().min(0).max(1_000_000).optional(),
  role: z.enum(['admin', 'member', 'supervisor']).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  // Pairing · null clears the marriage, uuid sets it.
  spouseId: z.string().uuid().nullable().optional(),
});

export async function editMember(input: z.infer<typeof editMemberSchema>) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  const { id, spouseId, ...rest } = editMemberSchema.parse(input);

  // Refuse self-demotion to avoid lockout
  if (id === me.id && rest.role && rest.role !== 'admin') {
    throw new Error('Cannot demote yourself · promote another admin first');
  }
  if (id === me.id && rest.status && rest.status !== 'approved') {
    throw new Error('Cannot change your own status · contact another admin');
  }

  await db.update(members).set(rest).where(eq(members.id, id));

  try {
    // Bidirectional spouse sync: setting A's spouse to B implies B's
    // spouse is A. Clearing breaks the link on both sides. If the
    // previous spouse was someone else (C), clear C's pointer too so
    // there's no dangling reference.
    if (spouseId !== undefined) {
      const [prev] = await db.select({ spouseId: members.spouseId }).from(members).where(eq(members.id, id)).limit(1);
      const previousSpouseId = prev?.spouseId ?? null;

      if (previousSpouseId && previousSpouseId !== spouseId) {
        // Clear stale partner's pointer back to us.
        await db.update(members).set({ spouseId: null }).where(eq(members.id, previousSpouseId));
      }

      if (spouseId) {
        // If new spouse is currently married to someone else (D), clear
        // D's pointer first to maintain monogamous pairing semantics.
        const [newPartner] = await db.select({ spouseId: members.spouseId }).from(members).where(eq(members.id, spouseId)).limit(1);
        if (newPartner?.spouseId && newPartner.spouseId !== id) {
          await db.update(members).set({ spouseId: null }).where(eq(members.id, newPartner.spouseId));
        }
        // Set both sides.
        await db.update(members).set({ spouseId }).where(eq(members.id, id));
        await db.update(members).set({ spouseId: id }).where(eq(members.id, spouseId));
      } else {
        // spouseId === null · explicit divorce; already cleared own side via main update.
        await db.update(members).set({ spouseId: null }).where(eq(members.id, id));
      }
    }
  } catch (spouseError) {
    // Log but don't fail the whole edit · spouse link can be retried
    console.error('[editMember] spouse sync failed:', spouseError instanceof Error ? spouseError.message : spouseError);
  }

  await audit(me.id, 'member-edited', `Edited member ${id}`, id);
  revalidatePath('/admin/members');
  revalidatePath('/tree');
}

/* ─── delete member (admin) · soft via deceased=false→true OR hard delete */
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
    if (adminCount <= 1) throw new Error('Cannot delete the last admin · promote another member first');
  }

  // Clear spouse pointer to prevent dangling references in tree
  await db.update(members).set({ spouseId: null }).where(eq(members.spouseId, memberId));
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
  await audit(me.id, 'emergency-create', `${data.caseType} ${data.amount} for ${data.beneficiaryName}`, me.id);
  // Broadcast push so every approved member sees the new case in time to vote
  void broadcastPush(me.id, {
    title: data.emergency ? '🚨 Emergency case opened' : '🆘 New case to vote on',
    body: `${data.beneficiaryName} · ${data.category} · Rs ${data.amount.toLocaleString('en-PK')}`,
    data: { type: 'case', caseId: created.id },
    channelId: 'cases',
  }).catch((err) => { console.error('[push] broadcast case:', err); });

  // Email alert · only for cases flagged emergency (so we don't spam on
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
      const userRows = await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, authIds));
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
    })().catch((err) => { console.error('[email] emergency case alert:', err); });
  }

  revalidatePath('/cases');
  revalidatePath('/dashboard');
  return created;
}

/* ─── issue loan (admin) */
const issueLoanSchema = z.object({
  memberId: z.string().uuid(),
  amount: z.number().int().positive().max(10_000_000),
  purpose: z.string().min(2).max(200),
  city: z.string().max(60).optional(),
  expectedReturn: z.string().nullable().optional(),
  // Agreed monthly repayment plan, e.g. Rs 500/month. Optional.
  installmentAmount: z.number().int().positive().max(10_000_000).nullable().optional(),
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
      installmentAmount: data.installmentAmount ?? null,
      caseId: data.caseId || null,
      paid: 0,
      active: true,
    })
    .returning();
  await audit(
    me.id,
    'loan-issue',
    `Issued ${data.amount} qarz: ${data.purpose}${data.installmentAmount ? ` · plan ${data.installmentAmount}/month` : ''}`,
    data.memberId,
  );
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
  // can't both pass · whichever loses the race gets `updated.length === 0`.
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

  // Now-safe insert + audit; if either fails, the weekly reconcile in
  // /api/cron/weekly-backup notices loans.paid disagreeing with
  // SUM(repayments.amount) and writes a ledger-reconcile-mismatch audit row.
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
  const me = await meOrThrow();
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw new Error('Invalid case id');
  if (me.role !== 'admin') throw new Error('Admin only');

  // Atomic: only updates when status is still 'approved' · prevents TOCTOU double-disburse
  const updated = await db
    .update(cases)
    .set({ status: 'disbursed', resolvedAt: new Date() })
    .where(and(eq(cases.id, caseId), eq(cases.status, 'approved')))
    .returning();

  if (updated.length === 0) {
    const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!c) throw new Error('Case not found');
    throw new Error(`Cannot disburse · case is currently "${c.status}"`);
  }

  const c = updated[0];
  await audit(me.id, 'case-disbursed', `Disbursed ${c.amount} for ${c.beneficiaryName}`, c.applicantId);

  // For qarz cases, auto-create the loan record so repayments can be tracked.
  // Guard against a duplicate loan if disburse is somehow retried (no DB
  // transaction on the neon-http driver).
  if (c.caseType === 'qarz') {
    const [existingLoan] = await db.select({ id: loans.id }).from(loans).where(eq(loans.caseId, c.id)).limit(1);
    if (!existingLoan) {
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
    }
    revalidatePath('/admin/loans');
  }

  revalidatePath('/cases');
  revalidatePath('/dashboard');
  revalidatePath('/admin/fund');
}

/* ─── admin veto: force-resolve a case regardless of votes
 *
 * Used when the community is taking too long, the request is clearly
 * urgent, or a stuck vote needs an admin call. Records as "veto" in
 * the audit log so the action is traceable.
 */
export async function adminResolveCase(caseId: string, decision: 'approved' | 'rejected') {
  const me = await meOrThrow();
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw new Error('Invalid case id');
  if (decision !== 'approved' && decision !== 'rejected') throw new Error('Invalid decision');
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
 * Use sparingly · disburse history is lost. Intended for duplicates,
 * test entries, or cases created in error. Disbursed cases that have
 * an associated loan are blocked to keep the loan ledger consistent.
 */
export async function adminDeleteCase(caseId: string) {
  const me = await meOrThrow();
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw new Error('Invalid case id');
  if (me.role !== 'admin') throw new Error('Admin only');

  const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  if (!c) throw new Error('Case not found');

  // If a loan was created from this case, refuse · admin must settle/
  // delete the loan first so the ledger stays consistent.
  if (c.status === 'disbursed') {
    const [linkedLoan] = await db.select({ id: loans.id }).from(loans).where(eq(loans.caseId, caseId)).limit(1);
    if (linkedLoan) {
      throw new Error('Case already disbursed and linked to an active loan · settle the loan first');
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
  // 24 chars from URL-safe alphabet · collision-resistant for our scale.
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
  // Admins may message anyone; members may only message approved members.
  if (me.role !== 'admin' && recipient.status !== 'approved') {
    throw new Error('Recipient not available');
  }

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

/* ─── fauti (death-benefit) case: admin opens a pre-approved payout for a
 * deceased member's family. No vote — by family convention fauti is a
 * fixed entitlement, so the case lands directly in 'approved' and the
 * admin disburses it with the normal disburseCase flow. */
export async function openFautiCase(memberId: string) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) throw new Error('Invalid member id');

  const [m] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!m) throw new Error('Member not found');
  if (!m.deceased) throw new Error('Fauti payout is only for deceased members');

  const [cfg] = await db.select().from(configTbl).where(eq(configTbl.id, 1)).limit(1);
  const amount = cfg?.fautiAmount ?? 0;
  if (amount <= 0) throw new Error('Set the fauti amount in Settings first');

  // One fauti case per member, ever.
  const [existing] = await db
    .select({ id: cases.id })
    .from(cases)
    .where(and(eq(cases.applicantId, memberId), eq(cases.category, 'fauti')))
    .limit(1);
  if (existing) throw new Error('A fauti case already exists for this member');

  const name = m.nameEn || m.nameUr;
  const [created] = await db
    .insert(cases)
    .values({
      applicantId: memberId,
      caseType: 'gift',
      pool: 'sadaqah',
      category: 'fauti',
      beneficiaryName: `Family of ${name}`,
      relation: 'family',
      city: m.city,
      amount,
      reasonUr: `فوتی فنڈ · مرحوم ${m.nameUr || m.nameEn} کے اہلِ خانہ کے لیے`,
      reasonEn: `Fauti fund payout for the family of the late ${name}`,
      emergency: false,
      status: 'approved',
    })
    .returning();

  await audit(me.id, 'fauti-opened', `Fauti payout ${amount} opened for family of ${name}`, memberId);
  revalidatePath('/cases');
  revalidatePath(`/admin/members/${memberId}`);
  return created;
}
