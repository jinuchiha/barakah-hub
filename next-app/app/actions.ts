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
 *   1. Obtain its caller through the right gate — NOT a bare `meOrThrow()`:
 *        · `requireAdmin()` / `requireFundManager()` for privileged actions.
 *          These check authenticated → approved → not deceased → role, in
 *          that order, so entitlement can never be skipped by a call site
 *          that remembers the role check but forgets the status check.
 *        · `meApprovedOrThrow()` for member-scoped actions (vote, submit,
 *          create case, message).
 *        · `meOrThrow()` ONLY for strictly self-scoped operations that a
 *          pending member must still perform (profile setup, marking their
 *          own notifications read).
 *   2. Check ownership explicitly where the role alone is not sufficient.
 *   3. Validate input with Zod (refuse anything from the body we cannot
 *      independently confirm against the session).
 *   4. Append an `audit_log` row for any state change.
 *
 * The `audit_log` table has UPDATE/DELETE triggers (migration 0002) and a
 * TRUNCATE trigger (migration 0017) that block tampering from the query
 * path. NOTE: they do not stop the table's own owner from dropping them,
 * and the app currently connects as that owner — see RUNBOOK.md
 * "Database privilege separation" for the outstanding infrastructure work.
 */
import { revalidatePath } from 'next/cache';
import { isAllowedReceiptUrl } from '@/lib/file-access';
import { eq, and, ne, sql, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { meOrThrow, meApprovedOrThrow, requireAdmin, requireFundManager } from '@/lib/auth-server';
import { db, inTransaction, type Tx } from '@/lib/db';

/**
 * Either the plain client or a transaction handle. Helpers take this so the
 * same code works inside and outside a transaction, and so a call site has to
 * state which one it means.
 */
type Conn = typeof db | Tx;
import { members, payments, cases, votes, loans, repayments, auditLog, notifications, messages, memberInvites, users, sessions, config as configTbl } from '@/lib/db/schema';
import { monthStartFromLabel } from '@/lib/month';
import { broadcastPush } from '@/lib/push';
import { notifyMembers as notify, fundApproverIds, adminIds, emailFundApprovers } from '@/lib/notify';
import { sendEmergencyCaseEmail } from '@/lib/email';
import { sendWhatsAppText, sendWhatsAppBusinessMessage } from '@/lib/whatsapp';
import { runAfterResponse } from '@/lib/after-response';
import { enqueue } from '@/lib/outbox';
import {
  creditPayment, debitLoanIssue, creditLoanRepayment, debitCaseDisbursement,
  reverse as reverseLedger, entryForSource, assertSufficientFunds,
} from '@/lib/ledger';

/* ─── helpers */

/**
 * Append an audit row.
 *
 * Takes the connection explicitly so it can be called with a transaction
 * handle. That is the whole point: the audit row must commit with the state
 * change it describes, not after it. Passing `db` here is only correct when
 * there is genuinely nothing to be atomic with.
 */
async function audit(conn: Conn, actorId: string, action: string, detail: string, targetId?: string) {
  await conn.insert(auditLog).values({ actorId, targetId, action, detail });
}

/**
 * Insert a payment at most once for a given idempotency key.
 *
 * Returns `inserted: false` together with the pre-existing row when the key
 * has already been used, so callers can skip the audit row, notifications
 * and emails on a replay while still handing the client the same payment it
 * created the first time.
 *
 * Three steps, because the key can lose a race even inside a transaction —
 * a concurrent transaction may have committed the same key already:
 *   1. Look the key up — the common replay case, and the cheapest.
 *   2. Insert with ON CONFLICT DO NOTHING — the partial unique index from
 *      migration 0017 makes a concurrent duplicate lose here rather than
 *      creating a second row.
 *   3. If the insert returned nothing, another attempt with the same key won;
 *      read its row back.
 *
 * With no key supplied the insert is unguarded — callers that can supply one
 * always should.
 */
async function insertPaymentOnce(
  conn: Conn,
  values: typeof payments.$inferInsert,
  idempotencyKey?: string,
): Promise<{ inserted: boolean; payment: typeof payments.$inferSelect }> {
  if (!idempotencyKey) {
    const [row] = await conn.insert(payments).values(values).returning();
    if (!row) throw new Error('Payment could not be recorded. Please try again.');
    return { inserted: true, payment: row };
  }

  const [prior] = await conn
    .select().from(payments)
    .where(eq(payments.idempotencyKey, idempotencyKey))
    .limit(1);
  if (prior) return { inserted: false, payment: prior };

  const inserted = await conn
    .insert(payments)
    .values({ ...values, idempotencyKey })
    .onConflictDoNothing()
    .returning();
  if (inserted.length > 0) return { inserted: true, payment: inserted[0] };

  const [raced] = await conn
    .select().from(payments)
    .where(eq(payments.idempotencyKey, idempotencyKey))
    .limit(1);
  if (raced) return { inserted: false, payment: raced };

  // ON CONFLICT fired but no row carries the key — the conflict came from a
  // different constraint. Surface it rather than silently dropping money.
  throw new Error('Payment could not be recorded. Please try again.');
}

/** WhatsApp one member (env-gated no-op) — never blocks the caller. */
function waToMember(memberId: string, body: string): void {
  runAfterResponse('whatsapp.member', async () => {
    const [m] = await db.select({ phone: members.phone }).from(members).where(eq(members.id, memberId)).limit(1);
    if (m?.phone) await sendWhatsAppText(m.phone, body);
  });
}

/* ─── approve pending member (admin) */
export async function approveMember(memberId: string) {
  const me = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) throw new Error('Invalid id');

  const [m] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!m) throw new Error('Member not found');
  if (m.status === 'approved') return;

  await inTransaction(async (tx) => {
    await tx.update(members).set({ status: 'approved' }).where(eq(members.id, memberId));
    await audit(tx, me.id, 'member-approved', `Approved ${m.nameEn || m.nameUr}`, memberId);
    await tx.insert(notifications).values({
      recipientId: memberId,
      titleUr: 'منظوری',
      titleEn: 'Approved',
      ur: 'آپ کا اکاؤنٹ منظور ہو گیا · اب آپ ایپ استعمال کر سکتے ہیں',
      en: 'Your account has been approved · you can now use the app',
      type: 'approved',
    });

    const who = m.nameEn || m.nameUr;
    await enqueue(tx, {
      channel: 'email',
      kind: 'member-approved',
      memberId,
      dedupeKey: `approved-email:${memberId}`,
      payload: {
        subject: 'Your Barakah Hub account is approved',
        body: `Salaam ${who},

Your account has been approved. You can now sign in and use the app.

JazakAllah Khair.`,
      },
    });
    await enqueue(tx, {
      channel: 'push',
      kind: 'member-approved',
      memberId,
      dedupeKey: `approved-push:${memberId}`,
      payload: {
        title: '🎉 Account approved',
        body: 'Salaam · your Barakah Hub account has been approved. Welcome!',
        data: { type: 'approved' },
        channelId: 'admin',
      },
    });
  });
  // Email + push for this approval were queued inside the transaction above.
  waToMember(memberId, `🎉 *مبارک ہو!*

${m.nameUr || m.nameEn} · آپ کا Barakah Hub اکاؤنٹ منظور ہو گیا۔ اب آپ ایپ استعمال کر سکتے ہیں۔

جزاک اللہ خیر`);
  revalidatePath('/admin/members');
}

/* ─── reject pending member (admin) */
export async function rejectMember(memberId: string) {
  const me = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) throw new Error('Invalid id');

  const [m] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!m) throw new Error('Member not found');
  if (m.status === 'rejected') return;

  await inTransaction(async (tx) => {
    await tx.update(members).set({ status: 'rejected' }).where(eq(members.id, memberId));
    // Kill every live session (web cookie + mobile bearer). Per-request
    // status re-reads already stop a rejected member acting, but the
    // session itself should not outlive the decision.
    if (m.authId) {
      await tx.delete(sessions).where(eq(sessions.userId, m.authId));
    }
    await audit(tx, me.id, 'member-rejected', `Rejected ${m.nameEn || m.nameUr}`, memberId);
    await tx.insert(notifications).values({
      recipientId: memberId,
      titleEn: 'Application not approved',
      titleUr: 'درخواست منظور نہیں ہوئی',
      en: 'Your membership application was not approved at this time. Please contact the administrator for details.',
      ur: 'آپ کی رکنیت کی درخواست اس وقت منظور نہیں ہوئی۔ تفصیل کے لیے ایڈمن سے رابطہ کریں۔',
      type: 'rejected',
    });
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
  const me = await requireAdmin();
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
  const toInsert = data.rows.filter((row) => {
    if (existingSet.has(row.username.toLowerCase())) {
      errors.push(`Skipped "${row.username}": username already exists`);
      return false;
    }
    return true;
  });
  const skipped = data.rows.length - toInsert.length;

  // One multi-row INSERT inside one transaction, replacing a loop of up to
  // 500 sequential inserts. Two things that fixes:
  //
  //  · Speed. Each insert was its own HTTP round-trip, so a large import
  //    walked straight into the function timeout — and, being non-atomic,
  //    left a half-imported roster behind when it did.
  //  · Correctness. The old per-row try/catch cannot work inside a
  //    transaction anyway: in Postgres any error aborts the enclosing
  //    transaction, so "catch and keep going" would just fail on the next
  //    statement. An import now either lands completely or not at all.
  if (toInsert.length > 0) {
    await inTransaction(async (tx) => {
      await tx.insert(members).values(
        toInsert.map((row) => ({ ...row, status: 'approved' as const, needsSetup: true })),
      );
      await audit(tx, me.id, 'bulk-import', `Imported ${toInsert.length}, skipped ${skipped}`);
    });
  } else {
    await audit(db, me.id, 'bulk-import', `Imported 0, skipped ${skipped}`);
  }

  revalidatePath('/admin/members');
  return { imported: toInsert.length, skipped, errors };
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
  // Marhoom ancestors get a record (for the family tree) but never an
  // account — needsSetup stays true and nobody claims it.
  deceased: z.boolean().optional(),
});

export async function addMember(input: z.infer<typeof addMemberSchema>) {
  const me = await requireAdmin('Only admin can add members');
  const data = addMemberSchema.parse(input);
  const created = await inTransaction(async (tx) => {
    const [row] = await tx
      .insert(members)
      .values({ ...data, status: 'approved', needsSetup: true })
      .returning();
    await audit(tx, me.id, 'member-added', `Added ${row.nameEn} (${row.username})`, row.id);
    return row;
  });
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
  // Same per-attempt key as submitDonation — an admin re-submitting after a
  // timeout must not create a second payment either.
  idempotencyKey: z.string().min(8).max(64).optional(),
});

export async function recordPayment(input: z.infer<typeof recordPaymentSchema>) {
  const me = await requireFundManager('Only admin or supervisor can record payments');
  const data = recordPaymentSchema.parse(input);
  // The payment row and its audit entry commit together, or neither does.
  // Notifications and email stay OUTSIDE the transaction: they are slow
  // third-party calls that must not hold a database connection open, and a
  // failed email must never roll back a recorded payment.
  const result = await inTransaction(async (tx) => {
    const r = await insertPaymentOnce(tx, {
      ...data,
      monthStart: monthStartFromLabel(data.monthLabel),
      status: 'submitted',
    }, data.idempotencyKey);
    if (!r.inserted) return r;
    await audit(
      tx,
      me.id,
      'payment-record',
      `Recorded ${data.pool} ${data.amount} for ${data.monthLabel} · awaiting supervisor approval`,
      data.memberId,
    );
    return r;
  });
  if (!result.inserted) return result.payment;
  const created = result.payment;
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
  runAfterResponse('recordPayment.emailApprovers', async () => {
    const [m] = await db.select().from(members).where(eq(members.id, data.memberId)).limit(1);
    await emailFundApprovers(
      { memberName: m?.nameEn || m?.nameUr || 'A member', amount: data.amount, pool: data.pool, monthLabel: data.monthLabel, note: data.note, paymentId: created.id },
      me.id,
    );
  });
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
  // App-internal storage references only — see isAllowedReceiptUrl.
  receiptUrl: z.string().max(500)
    .refine(isAllowedReceiptUrl, 'Receipt must be uploaded through the app')
    .optional(),
  // Per-attempt key generated by the client (one per filled form / one per
  // queued submission). Replaying it returns the original payment instead of
  // creating a second one — see submitDonation.
  idempotencyKey: z.string().min(8).max(64).optional(),
});

export async function submitDonation(input: z.infer<typeof submitDonationSchema>) {
  const me = await meApprovedOrThrow();
  const data = submitDonationSchema.parse(input);

  // Idempotent insert. A flaky network hides the difference between "the
  // server never got it" and "the server committed it but the response was
  // lost", and the user's only recovery is to submit again — which used to
  // create a second payment. The key makes the retry converge on the
  // original row, and everything downstream (audit, notifications, emails)
  // fires only for the attempt that actually inserted.
  const created = await inTransaction(async (tx) => {
    const r = await insertPaymentOnce(tx, {
      ...data,
      memberId: me.id,
      monthStart: monthStartFromLabel(data.monthLabel),
      status: 'submitted',
    }, data.idempotencyKey);
    if (!r.inserted) return r;
    await audit(tx, me.id, 'payment-self-submit', `Submitted ${data.pool} ${data.amount} for ${data.monthLabel}`, me.id);
    return r;
  });

  if (!created.inserted) return created.payment;
  const payment = created.payment;

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
  runAfterResponse('submitDonation.emailApprovers', () => emailFundApprovers(
    { memberName: me.nameEn || me.nameUr, amount: data.amount, pool: data.pool, monthLabel: data.monthLabel, note: data.note, receiptUrl: data.receiptUrl, paymentId: payment.id },
    me.id,
  ));
  revalidatePath('/myaccount');
  revalidatePath('/admin/fund');
  revalidatePath('/dashboard');
  return payment;
}

/* ─── supervisor approve (intermediate · admin still needs to verify) */
export async function supervisorApprovePayment(paymentId: string) {
  const me = await requireFundManager();
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) throw new Error('Invalid id');
  // Approval clears any prior rejection in case admin resent.
  const updated = await inTransaction(async (tx) => {
    const rows = await tx
      .update(payments)
      .set({
        status: 'supervisor_approved',
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
    // Throwing rolls the transaction back, so the guard needs no cleanup.
    if (rows.length === 0) throw new Error('Payment not found or already verified');
    await audit(
      tx,
      me.id,
      'payment-supervisor-approved',
      `Approved Rs ${rows[0].amount} ${rows[0].pool} · pending admin final verification`,
      rows[0].memberId,
    );
    return rows;
  });
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
  const me = await requireFundManager();
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) throw new Error('Invalid id');
  const trimmedNote = note?.trim().slice(0, 500) || null;
  const updated = await inTransaction(async (tx) => {
    const rows = await tx
      .update(payments)
      .set({
        status: 'supervisor_rejected',
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
    if (rows.length === 0) throw new Error('Payment not found or already verified');
    await audit(
      tx,
      me.id,
      'payment-supervisor-rejected',
      `Rejected Rs ${rows[0].amount} ${rows[0].pool}${trimmedNote ? ` · ${trimmedNote}` : ''}`,
      rows[0].memberId,
    );
    return rows;
  });
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
  waToMember(updated[0].memberId, `⛔ *ادائیگی مسترد*

آپ کی Rs ${updated[0].amount.toLocaleString('en-PK')} (${updated[0].pool}) کی ادائیگی سپروائزر نے مسترد کی${trimmedNote ? `
وجہ: ${trimmedNote}` : ''}۔

ایڈمن سے رابطہ کریں یا دوبارہ جمع کریں۔`);
  revalidatePath('/admin/fund');
}

/* ─── admin resend rejected payment back to supervisor */
export async function adminResendPaymentToSupervisor(paymentId: string) {
  const me = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) throw new Error('Invalid id');
  await inTransaction(async (tx) => {
    const rows = await tx
      .update(payments)
      .set({
        status: 'submitted',
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
    if (rows.length === 0) throw new Error('Payment not found or already verified');
    await audit(
      tx,
      me.id,
      'payment-resent-to-supervisor',
      `Resent Rs ${rows[0].amount} ${rows[0].pool} back to supervisor for re-approval`,
      rows[0].memberId,
    );
  });
  revalidatePath('/admin/fund');
}

/* ─── admin hard-delete payment (any state) */
export async function adminDeletePayment(paymentId: string) {
  const me = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) throw new Error('Invalid id');
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!p) return;
  // Two different operations wore one name here, and treating them the same
  // is how financial history gets destroyed:
  //
  //  · A VERIFIED payment is money the fund has recognised as received. It is
  //    in the books and it is history. It must be VOIDED — the row stays, a
  //    compensating ledger entry explains the correction, and the audit trail
  //    still names the original. Deleting it would silently move the balance
  //    with nothing to point at afterwards.
  //
  //  · A payment that was never verified never entered the books. It is a
  //    data-entry mistake — a typo, a duplicate slip — and deleting it is
  //    the correct cleanup, because there is nothing to preserve.
  //
  // The status enum makes the distinction unambiguous, and migration 0019's
  // trigger guarantees `verified` can only ever move to `voided`.
  const wasVerified = p.status === 'verified';

  await inTransaction(async (tx) => {
    if (wasVerified) {
      const entry = await entryForSource(tx, 'payment', paymentId);
      if (entry) {
        await reverseLedger(tx, {
          entryId: entry.id,
          reason: `Payment ${paymentId} voided by admin`,
          actorId: me.id,
        });
      }
      await tx.update(payments).set({ status: 'voided' }).where(eq(payments.id, paymentId));
      await audit(
        tx,
        me.id,
        'payment-voided',
        `Voided verified payment Rs ${p.amount} ${p.pool} for ${p.monthLabel}` +
        `${entry ? ' · ledger reversal posted' : ' · WARNING: no ledger entry found to reverse'}`,
        p.memberId,
      );
      return;
    }

    await tx.delete(payments).where(eq(payments.id, paymentId));
    await audit(
      tx,
      me.id,
      'payment-deleted',
      `Deleted unverified Rs ${p.amount} ${p.pool} for ${p.monthLabel} (never entered the books)`,
      p.memberId,
    );
  });
  revalidatePath('/admin/fund');
  revalidatePath('/dashboard');
}

/* ─── verify / reject pending payment (admin)
 *
 * Per workflow: cash is physically with the supervisor, so final verification
 * requires the supervisor to have approved. If supervisor rejected, admin
 * must either resend (adminResendPaymentToSupervisor) or delete
 * (adminDeletePayment) · they can't override the rejection here.
 */
export async function verifyPayment(paymentId: string) {
  const me = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) throw new Error('Invalid id');

  const [existing] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!existing) throw new Error('Payment not found');
  if (existing.status === 'verified') throw new Error('Already verified');
  if (existing.status === 'voided') throw new Error('This payment was voided · it cannot be verified.');
  if (existing.status === 'supervisor_rejected') {
    throw new Error('Supervisor rejected this payment · resend it for re-approval first, or delete it.');
  }
  if (existing.status !== 'supervisor_approved') {
    throw new Error('Supervisor must approve this payment first before admin can verify.');
  }
  // Two-person rule, enforced in role logic (not just UI): the person who
  // supervisor-approved the cash cannot also be the one who verifies it.
  //
  // The rule needs two eligible humans to exist. On a single-admin install
  // (the bootstrap founder, before any supervisor is appointed) there is only
  // one, so enforcing it strictly made EVERY payment unverifiable — the fund
  // total could never leave zero and the product's core loop was dead on
  // arrival. Silently waiving the rule would be worse: a financial control
  // that disappears without a trace is not a control.
  //
  // So: enforce it whenever two-person control is actually possible, and when
  // it is not, allow the verification but record the degraded control as its
  // own audit action so the exception is visible to anyone reading the trail.
  const selfApproved = existing.supervisorApprovedById === me.id;
  let singleControl = false;
  if (selfApproved) {
    const eligibleApprovers = await db.$count(
      members,
      and(
        eq(members.status, 'approved'),
        eq(members.deceased, false),
        inArray(members.role, ['admin', 'supervisor']),
      ),
    );
    if (eligibleApprovers > 1) {
      throw new Error('Two-person rule: you approved this payment as supervisor, so a different admin must verify it.');
    }
    singleControl = true;
  }

  const verifiedAt = new Date();
  // Conditional UPDATE so two admins clicking Verify at once can't both
  // "win" and double-send receipts — only the row that actually flips
  // triggers notifications.
  // The flip and its audit row commit together. Verifying a payment is the
  // moment money is recognised as received; a verification with no record of
  // who verified it is exactly what the audit trail exists to prevent.
  await inTransaction(async (tx) => {
    const flipped = await tx
      .update(payments)
      .set({ status: 'verified', verifiedById: me.id, verifiedAt })
      .where(and(eq(payments.id, paymentId), eq(payments.pendingVerify, true)))
      .returning({ id: payments.id });
    if (flipped.length === 0) throw new Error('Already verified');
    await audit(
      tx,
      me.id,
      singleControl ? 'payment-verified-single-control' : 'payment-verified',
      singleControl
        ? `Verified payment ${paymentId} under SINGLE-PERSON control — no second approved admin/supervisor existed at verification time. Appoint a supervisor to restore the two-person rule.`
        : `Verified payment ${paymentId}`,
    );
    // Verification is the moment the money is recognised as received, so
    // this is where it enters the books — not at submission, when it is
    // still only a claim. Idempotent on (source_type, source_id), so a
    // replay cannot credit the same payment twice.
    await creditPayment(tx, {
      paymentId,
      pool: existing.pool,
      amount: existing.amount,
      memberId: existing.memberId,
      monthLabel: existing.monthLabel,
      actorId: me.id,
    });

    // The receipt is queued in the SAME transaction that verified the
    // payment, so "verified" and "a receipt is owed" cannot disagree. The
    // dedupe key means a replayed verification does not send twice.
    const rs = `Rs ${existing.amount.toLocaleString('en-PK')}`;
    const receiptBody =
      `Your ${existing.pool} contribution of ${rs} for ${existing.monthLabel} has been verified.` +
      `

Receipt no: #${paymentId.slice(0, 8).toUpperCase()}` +
      `
Verify: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://barakah-hub.vercel.app'}/verify-receipt/${paymentId}`;

    await enqueue(tx, {
      channel: 'email',
      kind: 'payment-receipt',
      memberId: existing.memberId,
      dedupeKey: `receipt-email:${paymentId}`,
      payload: { subject: `Receipt · ${rs} ${existing.pool} · ${existing.monthLabel}`, body: receiptBody },
    });
    await enqueue(tx, {
      channel: 'push',
      kind: 'payment-verified',
      memberId: existing.memberId,
      dedupeKey: `receipt-push:${paymentId}`,
      payload: {
        title: '✅ Donation verified',
        body: `Your ${existing.pool} contribution of ${rs} has been verified.`,
        data: { type: 'payment-verified', paymentId },
        channelId: 'payments',
      },
    });
    await enqueue(tx, {
      channel: 'whatsapp',
      kind: 'payment-receipt',
      memberId: existing.memberId,
      dedupeKey: `receipt-wa:${paymentId}`,
      payload: {
        templateEnvVar: 'WHATSAPP_TEMPLATE_RECEIPT',
        templateParams: [rs, existing.monthLabel],
        fallbackText: receiptBody,
      },
    });
  });
  // The in-app notification row stays a direct write: it is a database row
  // in our own table, not a third-party call, so it has none of the delivery
  // problems the outbox exists to solve. Email, WhatsApp and push for this
  // verification were queued inside the transaction above.
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (p) {
    runAfterResponse('verifyPayment.inAppRow', () => notify([p.memberId], {
      titleEn: 'Donation verified',
      titleUr: 'عطیہ کی تصدیق ہو گئی',
      en: `Your ${p.pool} contribution of Rs ${p.amount.toLocaleString('en-PK')} for ${p.monthLabel} has been verified.`,
      ur: `${p.monthLabel} کا آپ کا عطیہ Rs ${p.amount.toLocaleString('en-PK')} تصدیق ہو گیا۔`,
      type: 'payment-verified',
    }));
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
  const me = await meApprovedOrThrow();
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw new Error('Invalid case id');
  // The whole vote — record, tally, resolve — is one transaction, and it
  // opens by taking a row lock on the case with SELECT ... FOR UPDATE.
  //
  // Why the lock. Previously the vote was inserted, then the tally was read
  // in a separate query. Two members voting at the same moment could each
  // read a tally that did not yet include the other's vote, so a case sitting
  // exactly on the threshold could fail to auto-resolve — and then sit in
  // 'voting' forever with the votes needed to decide it already cast. The
  // conditional UPDATE prevented DOUBLE resolution; nothing prevented a
  // MISSED one. Serialising voters on the same case removes the window.
  //
  // Locking one case row only, so votes on different cases stay concurrent.
  await inTransaction(async (tx) => {
    const [c] = await tx.select().from(cases).where(eq(cases.id, caseId)).limit(1).for('update');
    if (!c) throw new Error('Case not found');
    if (c.status !== 'voting') throw new Error('Voting closed');
    if (c.applicantId === me.id && me.role !== 'admin') {
      throw new Error('Cannot vote on your own request');
    }

    // Composite PK (case_id, member_id) enforces one vote per member; a
    // re-vote is a no-op rather than an error.
    await tx.insert(votes).values({ caseId, memberId: me.id, vote: yes }).onConflictDoNothing();
    await audit(tx, me.id, 'vote-cast', `Voted ${yes ? 'YES' : 'NO'} on case ${caseId}`, c.applicantId);

    // Tally now sees every committed vote, including any that landed while
    // this transaction was waiting on the lock.
    const allVotes = await tx.select().from(votes).where(eq(votes.caseId, caseId));
    const yesCount = allVotes.filter((v) => v.vote).length;
    const noCount = allVotes.filter((v) => !v.vote).length;

    const eligibleCount = await tx.$count(
      members,
      and(eq(members.deceased, false), eq(members.status, 'approved')),
    );
    const eligible = Math.max(0, eligibleCount - 1); // exclude applicant
    const [cfg] = await tx.select().from(configTbl).where(eq(configTbl.id, 1)).limit(1);
    // Require at least one vote, and never auto-resolve when there are no other
    // eligible voters (otherwise need=0 would approve a case on its first vote —
    // even a NO · with zero real consensus).
    const need = Math.max(1, Math.ceil(eligible * ((cfg?.voteThresholdPct ?? 50) / 100)));

    if (eligible > 0 && yesCount >= need) {
      await tx.update(cases).set({ status: 'approved', resolvedAt: new Date() }).where(and(eq(cases.id, caseId), eq(cases.status, 'voting')));
      await audit(tx, me.id, 'emergency-approved', `Case approved by majority`, c.applicantId);
    } else if (eligible > 0 && noCount >= need) {
      await tx.update(cases).set({ status: 'rejected', resolvedAt: new Date() }).where(and(eq(cases.id, caseId), eq(cases.status, 'voting')));
      await audit(tx, me.id, 'emergency-rejected', `Case rejected by majority`, c.applicantId);
    }
  });

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
  const me = await requireAdmin();
  const data = goalSchema.parse(input);
  await inTransaction(async (tx) => {
    await tx.update(configTbl).set(data).where(eq(configTbl.id, 1));
    await audit(tx, me.id, 'config-changed', `Goal updated to ${data.goalAmount}`);
  });
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
    // Only the app's own storage hosts. Anything else now renders as a
    // broken image anyway (next/image validates against remotePatterns),
    // and an arbitrary external URL was never a legitimate avatar source.
    .refine((v) => {
      if (!v) return true;
      if (v.startsWith('/uploads/')) return true;
      try {
        const { protocol, hostname } = new URL(v);
        return protocol === 'https:' && hostname.endsWith('.public.blob.vercel-storage.com');
      } catch {
        return false;
      }
    }, 'Photo must be uploaded through the app')
    .nullable()
    .optional(),
});

export async function updateProfile(input: z.infer<typeof profileSchema>) {
  const me = await meOrThrow();
  const data = profileSchema.parse(input);
  await inTransaction(async (tx) => {
    await tx.update(members).set({ ...data, needsSetup: false }).where(eq(members.id, me.id));
    await audit(tx, me.id, 'profile-updated', 'Self-edit via Settings');
  });
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
  const me = await requireAdmin();
  const data = adminCfgSchema.parse(input);
  await inTransaction(async (tx) => {
    await tx.update(configTbl).set(data).where(eq(configTbl.id, 1));
    // Redact the EasyPaisa account number: audit_log is append-only and can
    // never be scrubbed, so a personal payment number must not enter it.
    // Record THAT it changed, not what it is.
    const auditable = {
      ...data,
      easyPaiseNumber: data.easyPaiseNumber ? '[updated]' : data.easyPaiseNumber,
    };
    await audit(tx, me.id, 'config-changed', JSON.stringify(auditable));
  });
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
  // Explicit parent link · null clears it, uuid sets it. A child linked to
  // either spouse in a couple renders under both — see tree-data.ts.
  parentId: z.string().uuid().nullable().optional(),
  deceased: z.boolean().optional(),
});

export async function editMember(input: z.infer<typeof editMemberSchema>) {
  const me = await requireAdmin();
  const { id, spouseId, ...rest } = editMemberSchema.parse(input);

  // Refuse self-demotion to avoid lockout
  if (id === me.id && rest.role && rest.role !== 'admin') {
    throw new Error('Cannot demote yourself · promote another admin first');
  }
  if (id === me.id && rest.status && rest.status !== 'approved') {
    throw new Error('Cannot change your own status · contact another admin');
  }

  // Last-admin guard. hardDeleteMember had one; this path did not, so an
  // admin could demote or reject the only *other* admin — and two admins
  // demoting each other concurrently could leave the org with zero, which is
  // an unrecoverable lockout (there is no way back in without direct database
  // access). The conditional UPDATE below is the real gate: it only applies
  // when at least one OTHER approved, living admin still exists, so the
  // concurrent case has a single winner.
  const demotesAdmin = (rest.role && rest.role !== 'admin')
    || (rest.status && rest.status !== 'approved')
    || rest.deceased === true;

  if (demotesAdmin) {
    const [victim] = await db.select({ role: members.role }).from(members).where(eq(members.id, id)).limit(1);
    if (victim?.role === 'admin') {
      const otherAdmins = await db.$count(
        members,
        and(
          eq(members.role, 'admin'),
          eq(members.status, 'approved'),
          eq(members.deceased, false),
          ne(members.id, id),
        ),
      );
      if (otherAdmins < 1) {
        throw new Error('Cannot demote the last admin · promote another member to admin first');
      }
    }
  }

  // The edit and every spouse write are one unit.
  //
  // The spouse sync used to sit in a try/catch that logged and continued, so
  // a failure partway through left an ASYMMETRIC marriage graph — A pointing
  // at B while B pointed at nobody — and still reported success to the admin.
  // Up to five unprotected writes. Inside a transaction the catch is not just
  // unnecessary but harmful: in Postgres any error aborts the transaction, so
  // swallowing one would only fail again on the next statement. Let it throw;
  // the whole edit rolls back and the admin is told.
  await inTransaction(async (tx) => {
    await tx.update(members).set(rest).where(eq(members.id, id));

    // Bidirectional spouse sync: setting A's spouse to B implies B's
    // spouse is A. Clearing breaks the link on both sides. If the
    // previous spouse was someone else (C), clear C's pointer too so
    // there's no dangling reference.
    if (spouseId !== undefined) {
      const [prev] = await tx.select({ spouseId: members.spouseId }).from(members).where(eq(members.id, id)).limit(1);
      const previousSpouseId = prev?.spouseId ?? null;

      if (previousSpouseId && previousSpouseId !== spouseId) {
        // Clear stale partner's pointer back to us.
        await tx.update(members).set({ spouseId: null }).where(eq(members.id, previousSpouseId));
      }

      if (spouseId) {
        // If new spouse is currently married to someone else (D), clear
        // D's pointer first to maintain monogamous pairing semantics.
        const [newPartner] = await tx.select({ spouseId: members.spouseId }).from(members).where(eq(members.id, spouseId)).limit(1);
        if (newPartner?.spouseId && newPartner.spouseId !== id) {
          await tx.update(members).set({ spouseId: null }).where(eq(members.id, newPartner.spouseId));
        }
        // Set both sides.
        await tx.update(members).set({ spouseId }).where(eq(members.id, id));
        await tx.update(members).set({ spouseId: id }).where(eq(members.id, spouseId));
      } else {
        // spouseId === null · explicit divorce.
        await tx.update(members).set({ spouseId: null }).where(eq(members.id, id));
      }
    }

    await audit(tx, me.id, 'member-edited', `Edited member ${id}`, id);
  });
  revalidatePath('/admin/members');
  revalidatePath('/tree');
}

/* ─── delete member (admin) · soft via deceased=false→true OR hard delete */
export async function softDeleteMember(memberId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) throw new Error('Invalid id');
  const me = await requireAdmin();

  // Same last-admin protection as editMember and hardDeleteMember. Marking an
  // admin deceased revokes their power (requireRole refuses a deceased
  // caller), so doing it to the only admin locks the organisation out just as
  // surely as demoting them would.
  const [victim] = await db.select({ role: members.role, authId: members.authId }).from(members).where(eq(members.id, memberId)).limit(1);
  if (victim?.role === 'admin') {
    const otherAdmins = await db.$count(
      members,
      and(
        eq(members.role, 'admin'),
        eq(members.status, 'approved'),
        eq(members.deceased, false),
        ne(members.id, memberId),
      ),
    );
    if (otherAdmins < 1) {
      throw new Error('Cannot mark the last admin deceased · promote another member to admin first');
    }
  }

  await inTransaction(async (tx) => {
    await tx.update(members).set({ deceased: true }).where(eq(members.id, memberId));
    // A deceased member's account must not stay signed in anywhere — a
    // family member holding the phone should not be able to keep acting
    // through it.
    if (victim?.authId) {
      await tx.delete(sessions).where(eq(sessions.userId, victim.authId));
    }
    await audit(tx, me.id, 'member-deceased', `Marked deceased`, memberId);
  });
  revalidatePath('/admin/members');
  revalidatePath('/tree');
}

export async function hardDeleteMember(memberId: string) {
  const me = await requireAdmin();
  if (memberId === me.id) throw new Error('Cannot delete yourself');

  const [target] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!target) throw new Error('Member not found');

  if (target.role === 'admin') {
    const adminCount = await db.$count(members, and(eq(members.role, 'admin'), eq(members.deceased, false)));
    if (adminCount <= 1) throw new Error('Cannot delete the last admin · promote another member first');
  }

  // Refuse before mutating anything.
  //
  // This used to clear spouse pointers and re-parent children BEFORE the
  // delete. Both writes were redundant — members.parent_id (0001) and
  // members.spouse_id (0009) are both ON DELETE SET NULL, so the database
  // already handles them atomically — and both were actively harmful,
  // because audit_log.actor_id REFERENCES members(id) with no ON DELETE
  // clause. Every member has at least one audit row (onboarding writes
  // 'setup-complete'), so the DELETE always raised a foreign-key violation
  // AFTER those two updates had already committed. With no transaction on
  // the neon-http driver they were never rolled back: the admin saw an
  // error while the family tree had silently been rewritten.
  //
  // A member with financial or audit history must never be erasable anyway —
  // that history is the ledger. So: check every reference first, refuse with
  // an actionable message, and otherwise perform ONE statement that either
  // fully succeeds or changes nothing.
  // Six plain $count calls rather than one hand-rolled scalar-subquery
  // SELECT. This path runs only when an admin deletes a footprint-free
  // record, so the extra round-trips cost nothing, and $count is the API
  // used everywhere else in this file — no clever construct to be wrong
  // about in production.
  const [payCount, caseCount, loanCount, voteCount, auditCount, childCount] = await Promise.all([
    db.$count(payments, eq(payments.memberId, memberId)),
    db.$count(cases, eq(cases.applicantId, memberId)),
    db.$count(loans, eq(loans.memberId, memberId)),
    db.$count(votes, eq(votes.memberId, memberId)),
    db.$count(auditLog, eq(auditLog.actorId, memberId)),
    db.$count(members, eq(members.parentId, memberId)),
  ]);

  const blockers: string[] = [];
  if (payCount > 0) blockers.push('payment records');
  if (caseCount > 0) blockers.push('emergency cases');
  if (loanCount > 0) blockers.push('loans');
  if (voteCount > 0) blockers.push('votes');
  if (childCount > 0) blockers.push('children in the family tree');
  // Audit rows where this member is the ACTOR mean they performed actions of
  // their own, and that attribution must never be broken — so it blocks.
  // Rows where they are merely the TARGET (e.g. the 'member-added' entry an
  // admin wrote when creating them) do not block: those survive the delete
  // with target_id set to NULL by the FK (migration 0017), and the identity
  // they referred to is captured in the deletion entry written just below.
  if (auditCount > 0) blockers.push('audit-log actions they performed');

  if (blockers.length > 0) {
    throw new Error(
      `Cannot delete ${target.nameEn || target.nameUr}: this member has ${blockers.join(', ')}. ` +
      'Deleting would destroy financial or audit history. Mark them deceased instead, ' +
      'or reassign their children first.',
    );
  }

  // Record the identity BEFORE the row disappears, so the trail stays
  // readable once the FK nulls the target reference. No targetId here —
  // it would reference a member that no longer exists.
  await inTransaction(async (tx) => {
    await audit(
      tx,
      me.id,
      'member-deleted',
      `Hard deleted member ${memberId} · username=${target.username} · name=${target.nameEn || target.nameUr}`,
    );
    // spouse_id on any partner, and parent_id on any descendant, are cleared
    // by their own ON DELETE SET NULL constraints.
    await tx.delete(members).where(eq(members.id, memberId));
  });
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
  const me = await meApprovedOrThrow();
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

  const created = await inTransaction(async (tx) => {
    const [row] = await tx
      .insert(cases)
      .values({ ...data, applicantId: me.id, status: 'voting' })
      .returning();
    await audit(tx, me.id, 'emergency-create', `${data.caseType} ${data.amount} for ${data.beneficiaryName}`, me.id);
    return row;
  });
  // Emergency cases go out on WhatsApp too — the vote is time-critical.
  if (data.emergency) {
    runAfterResponse('createCase.emergencyWhatsApp', async () => {
      const voters = await db
        .select({ id: members.id, phone: members.phone })
        .from(members)
        .where(and(eq(members.status, 'approved'), eq(members.deceased, false), sql`${members.id} != ${me.id}`));
      for (const v of voters) {
        if (!v.phone) continue;
        await sendWhatsAppBusinessMessage(v.phone, {
          templateEnvVar: 'WHATSAPP_TEMPLATE_EMERGENCY',
          templateParams: [data.beneficiaryName, `Rs ${data.amount.toLocaleString('en-PK')}`],
          fallbackText: `🚨 *ہنگامی کیس · ووٹ درکار*

${data.beneficiaryName} کے لیے Rs ${data.amount.toLocaleString('en-PK')} کی درخواست
وجہ: ${data.reasonUr || data.reasonEn}

ووٹ دیں: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://barakah-hub.vercel.app'}/cases`,
        });
      }
    });
  }
  // Broadcast push so every approved member sees the new case in time to vote
  runAfterResponse('createCase.broadcastPush', () => broadcastPush(me.id, {
    title: data.emergency ? '🚨 Emergency case opened' : '🆘 New case to vote on',
    body: `${data.beneficiaryName} · ${data.category} · Rs ${data.amount.toLocaleString('en-PK')}`,
    data: { type: 'case', caseId: created.id },
    channelId: 'cases',
  }));

  // Email alert · only for cases flagged emergency (so we don't spam on
  // every routine request). Sends to every approved member except the
  // applicant themselves.
  if (data.emergency) {
    runAfterResponse('createCase.emergencyEmail', async () => {
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
    });
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
  const me = await requireAdmin();
  const data = issueLoanSchema.parse(input);

  const [borrower] = await db.select().from(members).where(eq(members.id, data.memberId)).limit(1);
  if (!borrower) throw new Error('Member not found');
  if (borrower.deceased) throw new Error('Cannot issue loan to a deceased member');
  if (borrower.status !== 'approved') throw new Error('Member must be approved to receive a loan');

  const created = await inTransaction(async (tx) => {
    // Refuse to lend money the fund does not hold. There was no solvency
    // check at all before the ledger existed — the gross-inflow total made
    // over-commitment invisible.
    await assertSufficientFunds(tx, 'qarz', data.amount);
    const [row] = await tx
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
      tx,
      me.id,
      'loan-issue',
      `Issued ${data.amount} qarz: ${data.purpose}${data.installmentAmount ? ` · plan ${data.installmentAmount}/month` : ''}`,
      data.memberId,
    );
    await debitLoanIssue(tx, {
      loanId: row.id, amount: data.amount, memberId: data.memberId,
      purpose: data.purpose, actorId: me.id,
    });
    return row;
  });
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
  const me = await requireAdmin();
  const data = repaySchema.parse(input);

  // The guarded UPDATE is still the race gate — only succeeds when the loan
  // is active AND the new total would not exceed the principal, so two
  // concurrent admins cannot both pass. The transaction adds the other half:
  // the balance change, the repayment row and the audit entry now commit
  // together, so loans.paid can no longer drift from SUM(repayments) because
  // one of the three writes failed alone. The weekly reconcile stays as a
  // safety net rather than the only thing that would ever notice.
  await inTransaction(async (tx) => {
    const rows = await tx
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

    if (rows.length === 0) {
      const [loan] = await tx.select().from(loans).where(eq(loans.id, data.loanId)).limit(1);
      if (!loan) throw new Error('Loan not found');
      if (!loan.active) throw new Error('Loan already settled');
      throw new Error(`Amount exceeds remaining ${loan.amount - loan.paid}`);
    }

    const loanRow = rows[0];
    const settled = !loanRow.active;

    const [repaymentRow] = await tx.insert(repayments).values({
      loanId: data.loanId,
      amount: data.amount,
      note: data.note,
    }).returning({ id: repayments.id });
    await creditLoanRepayment(tx, {
      repaymentId: repaymentRow.id, amount: data.amount,
      memberId: loanRow.memberId, actorId: me.id,
    });
    await audit(
      tx,
      me.id,
      'loan-repay',
      settled
        ? `Settled loan ${data.loanId} (final ${data.amount})`
        : `Repayment ${data.amount} on loan ${data.loanId}`,
      loanRow.memberId,
    );
  });

  revalidatePath('/admin/loans');
  revalidatePath('/dashboard');
}

/* ─── disburse an approved case (admin) */
export async function disburseCase(caseId: string) {
  const me = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw new Error('Invalid case id');

  // Atomic: only updates when status is still 'approved' · prevents TOCTOU double-disburse
  const c = await inTransaction(async (tx) => {
    const updated = await tx
      .update(cases)
      .set({ status: 'disbursed', resolvedAt: new Date() })
      .where(and(eq(cases.id, caseId), eq(cases.status, 'approved')))
      .returning();

    if (updated.length === 0) {
      const [current] = await tx.select().from(cases).where(eq(cases.id, caseId)).limit(1);
      if (!current) throw new Error('Case not found');
      throw new Error(`Cannot disburse · case is currently "${current.status}"`);
    }

    const row = updated[0];
    // Do not pay out money the pool does not hold.
    await assertSufficientFunds(tx, row.pool, row.amount);
    await audit(tx, me.id, 'case-disbursed', `Disbursed ${row.amount} for ${row.beneficiaryName}`, row.applicantId);

    // A GIFT leaves the fund here. A QARZ case's outflow is recorded by the
    // loan_issue entry for the loan created just below — posting both would
    // debit the fund twice for one disbursement.
    if (row.caseType === 'gift') {
      await debitCaseDisbursement(tx, {
        caseId: row.id, pool: row.pool, amount: row.amount,
        memberId: row.applicantId, beneficiaryName: row.beneficiaryName,
        actorId: me.id,
      });
    }

    // A qarz disbursement creates the loan that tracks repayment. This used
    // to be a separate write after the status flip, so a failure between the
    // two left a disbursed case with NO loan row — untracked debt that only
    // the weekly reconcile would eventually notice. Now it commits with the
    // flip, and loans.case_id is UNIQUE (migration 0017), so a retry cannot
    // create a second loan either.
    if (row.caseType === 'qarz') {
      const [loanRow] = await tx.insert(loans).values({
        memberId: row.applicantId,
        amount: row.amount,
        purpose: row.reasonEn,
        pool: 'qarz',
        city: row.city,
        caseId: row.id,
        paid: 0,
        active: true,
      }).onConflictDoNothing().returning({ id: loans.id });
      await audit(tx, me.id, 'loan-issue', `Auto-issued ${row.amount} qarz loan from disbursed case ${row.id}`, row.applicantId);
      // Only when the loan was actually created — a retry that hit the
      // unique index on loans.case_id must not debit the fund again.
      if (loanRow) {
        await debitLoanIssue(tx, {
          loanId: loanRow.id, amount: row.amount, memberId: row.applicantId,
          purpose: row.reasonEn, actorId: me.id,
        });
      }
    }
    return row;
  });
  waToMember(c.applicantId, `💸 *رقم ادا کر دی گئی*

${c.beneficiaryName} کے لیے Rs ${c.amount.toLocaleString('en-PK')} ادا کر دیے گئے ہیں۔

اللہ قبول فرمائے · جزاک اللہ خیر`);

  if (c.caseType === 'qarz') revalidatePath('/admin/loans');

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
  const me = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw new Error('Invalid case id');
  if (decision !== 'approved' && decision !== 'rejected') throw new Error('Invalid decision');

  // Atomic like disburseCase: only flips a case that is still voting, so a
  // concurrent vote-tally auto-resolve (or a second admin) can't be
  // silently overwritten by this veto.
  await inTransaction(async (tx) => {
    const resolved = await tx
      .update(cases)
      .set({ status: decision, resolvedAt: new Date() })
      .where(and(eq(cases.id, caseId), eq(cases.status, 'voting')))
      .returning();
    if (resolved.length === 0) {
      const [current] = await tx.select().from(cases).where(eq(cases.id, caseId)).limit(1);
      if (!current) throw new Error('Case not found');
      throw new Error(`Case already ${current.status}`);
    }
    const c = resolved[0];
    await audit(
      tx,
      me.id,
      decision === 'approved' ? 'emergency-approved' : 'emergency-rejected',
      `Admin veto: ${decision} for ${c.beneficiaryName} (${c.amount})`,
      c.applicantId,
    );
  });

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
  const me = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw new Error('Invalid case id');

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

  await inTransaction(async (tx) => {
    // Audit first, so the trail records the deletion even though the row it
    // names is about to disappear. Votes cascade-delete via FK
    // (ON DELETE CASCADE on votes.caseId).
    await audit(tx, me.id, 'case-deleted', `Deleted case ${c.beneficiaryName} (${c.amount})`, c.applicantId);
    await tx.delete(cases).where(eq(cases.id, caseId));
  });

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
  const me = await requireAdmin();
  const data = createInviteSchema.parse(input);
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + data.expiresInDays * 86_400_000);
  const created = await inTransaction(async (tx) => {
    const [row] = await tx
      .insert(memberInvites)
      .values({ token, createdById: me.id, label: data.label, maxUses: data.maxUses, expiresAt })
      .returning();
    await audit(tx, me.id, 'invite-created', `${data.label ?? 'Unnamed'} · uses=${data.maxUses} · expires=${expiresAt.toLocaleDateString('en-GB')}`);
    return row;
  });
  revalidatePath('/admin/invites');
  return created;
}

export async function revokeInvite(inviteId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(inviteId)) throw new Error('Invalid id');
  const me = await requireAdmin();
  await inTransaction(async (tx) => {
    await tx.update(memberInvites).set({ revoked: true }).where(eq(memberInvites.id, inviteId));
    await audit(tx, me.id, 'invite-revoked', inviteId);
  });
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
  const me = await meApprovedOrThrow();
  const data = sendMessageSchema.parse(input);

  const [recipient] = await db.select().from(members).where(eq(members.id, data.toId)).limit(1);
  if (!recipient) throw new Error('Recipient not found');
  if (recipient.deceased) throw new Error('Cannot message a deceased member');
  // Admins may message anyone; members may only message approved members.
  if (me.role !== 'admin' && recipient.status !== 'approved') {
    throw new Error('Recipient not available');
  }

  await inTransaction(async (tx) => {
    await tx.insert(messages).values({ ...data, fromId: me.id });
    // Also drop a notification on the recipient so they see the badge
    await tx.insert(notifications).values({
      recipientId: data.toId,
      titleUr: 'نیا پیغام',
      titleEn: 'New message',
      ur: data.subject,
      en: data.subject,
      type: 'msg',
    });
    await audit(tx, me.id, 'message-sent', `Subject: ${data.subject}`);
  });
  revalidatePath('/messages');
}

/* ─── fauti (death-benefit) case: admin opens a pre-approved payout for a
 * deceased member's family. No vote — by family convention fauti is a
 * fixed entitlement, so the case lands directly in 'approved' and the
 * admin disburses it with the normal disburseCase flow. */
export async function openFautiCase(memberId: string) {
  const me = await requireAdmin();
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
  const created = await inTransaction(async (tx) => {
    const [row] = await tx
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
    await audit(tx, me.id, 'fauti-opened', `Fauti payout ${amount} opened for family of ${name}`, memberId);
    return row;
  });
  revalidatePath('/cases');
  revalidatePath(`/admin/members/${memberId}`);
  return created;
}

/* ─── manually verify a user's email (admin)
 *
 * Escape hatch for OTP-delivery failure: the Resend sandbox sender
 * (onboarding@resend.dev) only delivers to the Resend account owner, so
 * family members' verification codes never arrive until a custom domain
 * is verified. This lets the admin unblock a stuck account directly.
 */
export async function adminVerifyEmailByAddress(email: string): Promise<{ verified: boolean }> {
  const me = await requireAdmin();
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Invalid email address');

  // Mask the address in the audit trail — enough to trace, not to leak.
  const masked = `${clean.slice(0, 2)}***@${clean.split('@')[1]}`;
  await inTransaction(async (tx) => {
    const updated = await tx
      .update(users)
      .set({ emailVerified: true })
      .where(sql`LOWER(${users.email}) = ${clean}`)
      .returning({ id: users.id });
    if (updated.length === 0) throw new Error('No account found with this email');
    await audit(tx, me.id, 'email-verified-manually', `Admin manually verified ${masked}`);
  });
  return { verified: true };
}
