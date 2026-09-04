/**
 * Unit tests for lib/ledger.ts — the sign conventions and the solvency gate.
 *
 * The database-level guarantees (append-only, one entry per source,
 * reversal shape) are proven by test/integration/ledger.test.ts against real
 * Postgres. What is checked here is the arithmetic and the direction of
 * money, because a sign error in a ledger is silent and compounding: it does
 * not throw, it just makes the balance wrong forever.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeQuery } from '../helpers/db-mock';

const dbMock = vi.hoisted(() => ({ instance: null as unknown }));
vi.mock('@/lib/db', () => ({ get db() { return dbMock.instance; } }));

/** Capture what would be written, and control what balance reads return. */
function ledgerMock(opts: { groups?: unknown[]; total?: number } = {}) {
  const written: Record<string, unknown>[] = [];
  const selects: unknown[] = [];
  const instance = {
    insert: () => {
      const chain = makeQuery([{ id: 'entry-1' }]);
      const origValues = chain.values as (v: unknown) => unknown;
      (chain as Record<string, unknown>).values = (v: unknown) => {
        written.push(v as Record<string, unknown>);
        return origValues(v);
      };
      return chain;
    },
    select: (proj?: unknown) => {
      selects.push(proj);
      // A grouped query (poolBalances) vs a single-total query (poolBalance)
      // are distinguished by whether the caller asked for `pool`.
      const wantsGroups = Boolean(proj && typeof proj === 'object' && 'pool' in (proj as object));
      return makeQuery(
        wantsGroups
          ? (opts.groups ?? [])
          : [{ total: String(opts.total ?? 0) }],
      );
    },
  };
  dbMock.instance = instance;
  return { written, instance };
}

beforeEach(() => vi.resetModules());

describe('money moves in the right direction', () => {
  it('a verified payment is a CREDIT (positive)', async () => {
    const { written } = ledgerMock();
    const { creditPayment } = await import('@/lib/ledger');
    await creditPayment(dbMock.instance as never, {
      paymentId: 'p1', pool: 'sadaqah', amount: 500,
      memberId: 'm1', monthLabel: 'May 2026', actorId: 'a1',
    });
    expect(written[0]).toMatchObject({
      pool: 'sadaqah', amount: 500, sourceType: 'payment', sourceId: 'p1',
    });
  });

  it('issuing a loan is a DEBIT (negative) against the qarz pool', async () => {
    const { written } = ledgerMock();
    const { debitLoanIssue } = await import('@/lib/ledger');
    await debitLoanIssue(dbMock.instance as never, {
      loanId: 'l1', amount: 600, memberId: 'm1', purpose: 'seeds', actorId: 'a1',
    });
    expect(written[0]).toMatchObject({ pool: 'qarz', amount: -600, sourceType: 'loan_issue' });
  });

  it('a repayment is a CREDIT back into qarz', async () => {
    const { written } = ledgerMock();
    const { creditLoanRepayment } = await import('@/lib/ledger');
    await creditLoanRepayment(dbMock.instance as never, {
      repaymentId: 'r1', amount: 150, memberId: 'm1', actorId: 'a1',
    });
    expect(written[0]).toMatchObject({ pool: 'qarz', amount: 150, sourceType: 'loan_repayment' });
  });

  it('a gift disbursement is a DEBIT from its own pool', async () => {
    const { written } = ledgerMock();
    const { debitCaseDisbursement } = await import('@/lib/ledger');
    await debitCaseDisbursement(dbMock.instance as never, {
      caseId: 'c1', pool: 'zakat', amount: 200, memberId: 'm1',
      beneficiaryName: 'Ward', actorId: 'a1',
    });
    expect(written[0]).toMatchObject({ pool: 'zakat', amount: -200, sourceType: 'case_disbursement' });
  });

  it('normalises the sign so a caller passing a negative cannot flip a debit into a credit', async () => {
    const { written } = ledgerMock();
    const { debitLoanIssue, creditLoanRepayment } = await import('@/lib/ledger');
    await debitLoanIssue(dbMock.instance as never, {
      loanId: 'l1', amount: -600, memberId: 'm1', purpose: 'p', actorId: 'a1',
    });
    await creditLoanRepayment(dbMock.instance as never, {
      repaymentId: 'r1', amount: -150, memberId: 'm1', actorId: 'a1',
    });
    expect(written[0]).toMatchObject({ amount: -600 }); // still a debit
    expect(written[1]).toMatchObject({ amount: 150 });  // still a credit
  });

  it('refuses a zero entry rather than writing a meaningless row', async () => {
    ledgerMock();
    const { creditPayment } = await import('@/lib/ledger');
    await expect(creditPayment(dbMock.instance as never, {
      paymentId: 'p1', pool: 'sadaqah', amount: 0,
      memberId: 'm1', monthLabel: 'May 2026', actorId: 'a1',
    })).rejects.toThrow(/cannot be zero/i);
  });
});

describe('poolBalances', () => {
  it('nets inflow against outflow per pool and totals them', async () => {
    ledgerMock({
      groups: [
        { pool: 'sadaqah', inflow: '1500', outflow: '300' },
        { pool: 'zakat', inflow: '250', outflow: '0' },
        { pool: 'qarz', inflow: '2200', outflow: '800' },
      ],
    });
    const { poolBalances } = await import('@/lib/ledger');
    const b = await poolBalances();

    expect(b.available).toEqual({ sadaqah: 1200, zakat: 250, qarz: 1400 });
    expect(b.inflow.sadaqah).toBe(1500);
    expect(b.outflow.sadaqah).toBe(300);
    expect(b.totalAvailable).toBe(2850);
  });

  it('reports zero for a pool with no entries rather than undefined', async () => {
    ledgerMock({ groups: [] });
    const { poolBalances } = await import('@/lib/ledger');
    const b = await poolBalances();
    expect(b.available).toEqual({ sadaqah: 0, zakat: 0, qarz: 0 });
    expect(b.totalAvailable).toBe(0);
  });

  it('keeps inflow and available distinct — conflating them is the original bug', async () => {
    // Gross inflow of 1000 with 1000 already disbursed is a balance of ZERO.
    // The old fund total reported 1000 and members believed it.
    ledgerMock({ groups: [{ pool: 'sadaqah', inflow: '1000', outflow: '1000' }] });
    const { poolBalances } = await import('@/lib/ledger');
    const b = await poolBalances();
    expect(b.inflow.sadaqah).toBe(1000);
    expect(b.available.sadaqah).toBe(0);
  });
});

describe('assertSufficientFunds — the solvency gate', () => {
  it('allows a spend within the balance', async () => {
    ledgerMock({ total: 1000 });
    const { assertSufficientFunds } = await import('@/lib/ledger');
    await expect(assertSufficientFunds(dbMock.instance as never, 'qarz', 1000)).resolves.toBeUndefined();
    await expect(assertSufficientFunds(dbMock.instance as never, 'qarz', 1)).resolves.toBeUndefined();
  });

  it('refuses a spend beyond the balance, naming both figures', async () => {
    ledgerMock({ total: 500 });
    const { assertSufficientFunds } = await import('@/lib/ledger');
    const err = await assertSufficientFunds(dbMock.instance as never, 'qarz', 900).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/insufficient qarz/i);
    expect((err as Error).message).toMatch(/500/);
    expect((err as Error).message).toMatch(/900/);
  });

  it('refuses any spend when the pool is empty', async () => {
    ledgerMock({ total: 0 });
    const { assertSufficientFunds } = await import('@/lib/ledger');
    await expect(assertSufficientFunds(dbMock.instance as never, 'sadaqah', 1))
      .rejects.toThrow(/insufficient/i);
  });

  it('refuses when the pool is already overdrawn', async () => {
    ledgerMock({ total: -450 });
    const { assertSufficientFunds } = await import('@/lib/ledger');
    await expect(assertSufficientFunds(dbMock.instance as never, 'qarz', 100))
      .rejects.toThrow(/insufficient/i);
  });
});

describe('reverse', () => {
  it('writes the exact opposite amount and names what it undoes', async () => {
    const written: Record<string, unknown>[] = [];
    dbMock.instance = {
      select: () => makeQuery([{
        id: 'orig', pool: 'zakat', amount: 750, sourceType: 'payment', memberId: 'm1',
      }]),
      insert: () => {
        const chain = makeQuery([{ id: 'rev' }]);
        const origValues = chain.values as (v: unknown) => unknown;
        (chain as Record<string, unknown>).values = (v: unknown) => {
          written.push(v as Record<string, unknown>);
          return origValues(v);
        };
        return chain;
      },
    };
    const { reverse } = await import('@/lib/ledger');
    await reverse(dbMock.instance as never, { entryId: 'orig', reason: 'admin void', actorId: 'a1' });

    expect(written[0]).toMatchObject({
      pool: 'zakat',
      amount: -750,
      sourceType: 'reversal',
      reversesId: 'orig',
      sourceId: null,
    });
    expect(String(written[0].detail)).toMatch(/admin void/);
  });

  it('refuses to reverse a reversal', async () => {
    dbMock.instance = {
      select: () => makeQuery([{ id: 'r', pool: 'zakat', amount: -750, sourceType: 'reversal' }]),
      insert: () => makeQuery([]),
    };
    const { reverse } = await import('@/lib/ledger');
    await expect(reverse(dbMock.instance as never, { entryId: 'r', reason: 'x', actorId: 'a1' }))
      .rejects.toThrow(/cannot reverse a reversal/i);
  });

  it('refuses when the entry does not exist', async () => {
    dbMock.instance = { select: () => makeQuery([]), insert: () => makeQuery([]) };
    const { reverse } = await import('@/lib/ledger');
    await expect(reverse(dbMock.instance as never, { entryId: 'nope', reason: 'x', actorId: 'a1' }))
      .rejects.toThrow(/not found/i);
  });
});
