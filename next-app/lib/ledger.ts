import { eq, sql } from 'drizzle-orm';
import { db, type Tx } from '@/lib/db';
import { ledgerEntries } from '@/lib/db/schema';

/**
 * The fund's books.
 *
 * Before this module the "fund total" was `SUM(amount) FROM payments WHERE
 * pending_verify = false` — gross inflow, computed ad hoc in several places,
 * with no debit side at all. So the balance shown to members counted every
 * rupee ever disbursed as if it were still there, loans could be issued
 * against money that had already left, and correcting a mistake meant
 * deleting the payment rather than reversing it.
 *
 * Now: one signed row per movement, and a pool's balance is SUM(amount).
 * One definition, in one place, that cannot drift.
 *
 * Every posting function takes a connection so it can run inside the same
 * transaction as the state change it accounts for. A ledger entry that
 * commits separately from the payment it describes would reintroduce exactly
 * the drift this replaces.
 */

type Conn = typeof db | Tx;
export type Pool = 'sadaqah' | 'zakat' | 'qarz';

export interface PoolBalances {
  /** Money currently held, per pool: inflow minus outflow. */
  available: Record<Pool, number>;
  /** Total inflow ever recorded, per pool. */
  inflow: Record<Pool, number>;
  /** Total outflow ever recorded, per pool (a positive number). */
  outflow: Record<Pool, number>;
  /** Sum of `available` across pools. */
  totalAvailable: number;
}

const ZERO: Record<Pool, number> = { sadaqah: 0, zakat: 0, qarz: 0 };

/**
 * Read every pool's position in one query.
 *
 * Returns inflow and outflow separately as well as the net, because the two
 * answer different questions: "how much has the family contributed in total"
 * (a thing worth celebrating) and "how much can we actually commit right
 * now" (the number that must gate a loan). Conflating them is what made the
 * old total misleading.
 */
export async function poolBalances(conn: Conn = db): Promise<PoolBalances> {
  const rows = await conn
    .select({
      pool: ledgerEntries.pool,
      inflow: sql<string>`COALESCE(SUM(CASE WHEN ${ledgerEntries.amount} > 0 THEN ${ledgerEntries.amount} ELSE 0 END), 0)`,
      outflow: sql<string>`COALESCE(SUM(CASE WHEN ${ledgerEntries.amount} < 0 THEN -${ledgerEntries.amount} ELSE 0 END), 0)`,
    })
    .from(ledgerEntries)
    .groupBy(ledgerEntries.pool);

  const available = { ...ZERO };
  const inflow = { ...ZERO };
  const outflow = { ...ZERO };

  for (const r of rows) {
    const pool = r.pool as Pool;
    inflow[pool] = Number(r.inflow);
    outflow[pool] = Number(r.outflow);
    available[pool] = inflow[pool] - outflow[pool];
  }

  return {
    available,
    inflow,
    outflow,
    totalAvailable: available.sadaqah + available.zakat + available.qarz,
  };
}

/** Balance of a single pool. Cheaper than poolBalances when only one matters. */
export async function poolBalance(pool: Pool, conn: Conn = db): Promise<number> {
  const [row] = await conn
    .select({ total: sql<string>`COALESCE(SUM(${ledgerEntries.amount}), 0)` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.pool, pool));
  return Number(row?.total ?? 0);
}

/**
 * Post one entry.
 *
 * `ON CONFLICT DO NOTHING` against the (source_type, source_id) unique index
 * makes this idempotent: a retried verification, a double-fired cron or a
 * replayed request cannot credit the same payment twice. Returns whether a
 * row was actually written, so callers can tell a real posting from a replay.
 */
async function post(conn: Conn, entry: {
  pool: Pool;
  amount: number;
  sourceType: 'payment' | 'loan_issue' | 'loan_repayment' | 'case_disbursement';
  sourceId: string;
  memberId?: string | null;
  detail?: string;
  createdBy?: string | null;
}): Promise<boolean> {
  if (entry.amount === 0) {
    // The CHECK constraint would refuse it; fail with a message that says why.
    throw new Error('Ledger entries cannot be zero');
  }
  const written = await conn
    .insert(ledgerEntries)
    .values({
      pool: entry.pool,
      amount: entry.amount,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      memberId: entry.memberId ?? null,
      detail: entry.detail,
      createdBy: entry.createdBy ?? null,
    })
    .onConflictDoNothing()
    // No field selection: on a `db | Tx` union the overloads for the
    // narrowing form do not unify. We only need to know whether a row
    // landed, so the full row is fine.
    .returning();
  return written.length > 0;
}

/** A verified contribution: money in. Written at VERIFICATION, not submission —
 *  that is the point at which the money is recognised as received. */
export function creditPayment(conn: Conn, p: {
  paymentId: string; pool: Pool; amount: number; memberId: string;
  monthLabel: string; actorId: string;
}): Promise<boolean> {
  return post(conn, {
    pool: p.pool,
    amount: p.amount,
    sourceType: 'payment',
    sourceId: p.paymentId,
    memberId: p.memberId,
    detail: `Verified contribution for ${p.monthLabel}`,
    createdBy: p.actorId,
  });
}

/** Qarz handed to a borrower: money out of the qarz pool. */
export function debitLoanIssue(conn: Conn, l: {
  loanId: string; amount: number; memberId: string; purpose: string; actorId: string;
}): Promise<boolean> {
  return post(conn, {
    pool: 'qarz',
    amount: -Math.abs(l.amount),
    sourceType: 'loan_issue',
    sourceId: l.loanId,
    memberId: l.memberId,
    detail: `Qarz issued: ${l.purpose}`,
    createdBy: l.actorId,
  });
}

/** Qarz coming back: money in. */
export function creditLoanRepayment(conn: Conn, r: {
  repaymentId: string; amount: number; memberId: string; actorId: string;
}): Promise<boolean> {
  return post(conn, {
    pool: 'qarz',
    amount: Math.abs(r.amount),
    sourceType: 'loan_repayment',
    sourceId: r.repaymentId,
    memberId: r.memberId,
    detail: 'Qarz repayment received',
    createdBy: r.actorId,
  });
}

/**
 * A gift paid out: money out.
 *
 * Only for `gift` cases. A qarz case's outflow is recorded by the
 * `loan_issue` entry for the loan it creates — posting both would debit the
 * fund twice for a single disbursement.
 */
export function debitCaseDisbursement(conn: Conn, c: {
  caseId: string; pool: Pool; amount: number; memberId: string;
  beneficiaryName: string; actorId: string;
}): Promise<boolean> {
  return post(conn, {
    pool: c.pool,
    amount: -Math.abs(c.amount),
    sourceType: 'case_disbursement',
    sourceId: c.caseId,
    memberId: c.memberId,
    detail: `Disbursed to ${c.beneficiaryName}`,
    createdBy: c.actorId,
  });
}

/**
 * Undo an entry by adding its opposite.
 *
 * The ledger is append-only, so a correction is a new row, not an edit. Used
 * when a verified payment or a disbursed gift is voided: the original stays
 * visible and the reversal explains itself.
 */
export async function reverse(conn: Conn, r: {
  entryId: string; reason: string; actorId: string;
}): Promise<void> {
  const [original] = await conn
    .select().from(ledgerEntries).where(eq(ledgerEntries.id, r.entryId)).limit(1);
  if (!original) throw new Error('Ledger entry not found');
  if (original.sourceType === 'reversal') {
    throw new Error('Cannot reverse a reversal · post a fresh correcting entry instead');
  }

  await conn.insert(ledgerEntries).values({
    pool: original.pool,
    amount: -original.amount,
    sourceType: 'reversal',
    // A reversal shares no source row; it names the entry it undoes.
    sourceId: null,
    reversesId: original.id,
    memberId: original.memberId,
    detail: `Reversal: ${r.reason}`,
    createdBy: r.actorId,
  });
}

/** Find the entry that accounts for a given source row, if any. */
export async function entryForSource(
  conn: Conn,
  sourceType: 'payment' | 'loan_issue' | 'loan_repayment' | 'case_disbursement',
  sourceId: string,
): Promise<{ id: string; amount: number } | null> {
  const [row] = await conn
    .select({ id: ledgerEntries.id, amount: ledgerEntries.amount })
    .from(ledgerEntries)
    .where(sql`${ledgerEntries.sourceType} = ${sourceType} AND ${ledgerEntries.sourceId} = ${sourceId}`)
    .limit(1);
  return row ?? null;
}

/**
 * Refuse to commit money the fund does not hold.
 *
 * There was no solvency check anywhere: issueLoan and disburseCase would
 * happily commit more than the fund had, and the overstated gross-inflow
 * total meant nobody could see it happening.
 *
 * Deliberately advisory in shape — it throws a message a human can act on
 * rather than silently clamping. Call inside the transaction that is about
 * to spend, so the balance read and the spend are consistent.
 */
export async function assertSufficientFunds(conn: Conn, pool: Pool, amount: number): Promise<void> {
  const balance = await poolBalance(pool, conn);
  if (amount > balance) {
    throw new Error(
      `Insufficient ${pool} funds · available Rs ${balance.toLocaleString('en-PK')}, ` +
      `requested Rs ${amount.toLocaleString('en-PK')}`,
    );
  }
}
