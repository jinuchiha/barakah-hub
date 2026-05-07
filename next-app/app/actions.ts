'use server';
/**
 * Server actions — all mutations go through here.
 * RLS provides defense-in-depth; these add validation + business rules.
 */
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { members, payments, cases, votes, loans, auditLog, config as configTbl } from '@/lib/db/schema';

/* ─── helpers */
async function meOrThrow() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const [m] = await db.select().from(members).where(eq(members.authId, user.id)).limit(1);
  if (!m) throw new Error('Member record not found');
  return m;
}

async function audit(actorId: string, action: string, detail: string, targetId?: string) {
  await db.insert(auditLog).values({ actorId, targetId, action, detail });
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
    .values({ ...data, pendingVerify: false, verifiedById: me.id, verifiedAt: new Date() })
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
  const data = submitDonationSchema.parse(input);
  const [created] = await db
    .insert(payments)
    .values({ ...data, memberId: me.id, pendingVerify: true })
    .returning();
  await audit(me.id, 'payment-self-submit', `Submitted ${data.pool} ${data.amount} for ${data.monthLabel}`, me.id);
  revalidatePath('/myaccount');
  revalidatePath('/admin/fund');
  return created;
}

/* ─── verify / reject pending payment (admin) */
export async function verifyPayment(paymentId: string) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  await db
    .update(payments)
    .set({ pendingVerify: false, verifiedById: me.id, verifiedAt: new Date() })
    .where(eq(payments.id, paymentId));
  await audit(me.id, 'payment-verified', `Verified payment ${paymentId}`);
  revalidatePath('/admin/fund');
  revalidatePath('/myaccount');
}

export async function rejectPayment(paymentId: string) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!p) return;
  await db.delete(payments).where(eq(payments.id, paymentId));
  await audit(me.id, 'payment-rejected', `Rejected payment ${paymentId} (${p.amount})`, p.memberId);
  revalidatePath('/admin/fund');
}

/* ─── cast vote on a case */
export async function castVote(caseId: string, yes: boolean) {
  const me = await meOrThrow();
  const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  if (!c) throw new Error('Case not found');
  if (c.status !== 'voting') throw new Error('Voting closed');
  if (c.applicantId === me.id) throw new Error('Cannot vote on your own request');
  if (me.deceased) throw new Error('Not eligible');

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
  const need = Math.ceil(eligible * (cfg.voteThresholdPct / 100));

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
  photoUrl: z.string().url().nullable().optional(),
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

/* ─── delete member (admin) — soft via deceased=false→true OR hard delete */
export async function softDeleteMember(memberId: string) {
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
  // Re-parent any children to the admin
  await db.update(members).set({ parentId: me.id }).where(eq(members.parentId, memberId));
  await db.delete(members).where(eq(members.id, memberId));
  await audit(me.id, 'member-deleted', 'Hard deleted', memberId);
  revalidatePath('/admin/members');
  revalidatePath('/tree');
}

/* ─── create case (any approved member) */
const caseSchema = z.object({
  caseType: z.enum(['gift', 'qarz']),
  pool: z.enum(['sadaqah', 'zakat', 'qarz']).default('sadaqah'),
  category: z.string().min(1).max(40),
  beneficiaryName: z.string().min(2).max(80),
  relation: z.string().max(40).optional(),
  city: z.string().max(60).optional(),
  amount: z.number().int().positive().max(10_000_000),
  reasonUr: z.string().min(3).max(500),
  reasonEn: z.string().min(3).max(500),
  emergency: z.boolean().default(false),
  doc: z.string().max(200).optional(),
  returnDate: z.string().nullable().optional(),
});

export async function createCase(input: z.infer<typeof caseSchema>) {
  const me = await meOrThrow();
  if (me.status !== 'approved') throw new Error('Account not approved');
  const data = caseSchema.parse(input);
  const [created] = await db
    .insert(cases)
    .values({ ...data, applicantId: me.id, status: 'voting' })
    .returning();
  await audit(me.id, 'emergency-create', `${data.caseType} ${data.amount} for ${data.beneficiaryName}`);
  revalidatePath('/cases');
  revalidatePath('/dashboard');
  return created;
}

/* ─── notifications: mark read */
export async function markAllNotificationsRead() {
  const me = await meOrThrow();
  const { notifications } = await import('@/lib/db/schema');
  await db.update(notifications).set({ read: true }).where(eq(notifications.recipientId, me.id));
  revalidatePath('/notifications');
}

/* ─── messages: send */
const sendMessageSchema = z.object({
  toId: z.string().uuid(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

export async function sendMessage(input: z.infer<typeof sendMessageSchema>) {
  const me = await meOrThrow();
  const data = sendMessageSchema.parse(input);
  const { messages, notifications } = await import('@/lib/db/schema');
  await db.insert(messages).values({ ...data, fromId: me.id });
  // Also drop a notification on the recipient so they see the badge
  await db.insert(notifications).values({
    recipientId: data.toId,
    ur: `نیا پیغام: ${data.subject}`,
    en: `New message: ${data.subject}`,
    type: 'msg',
  });
  await audit(me.id, 'message-sent', `Subject: ${data.subject}`);
  revalidatePath('/messages');
}
