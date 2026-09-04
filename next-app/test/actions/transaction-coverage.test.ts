/**
 * Structural guard on transaction discipline.
 *
 * Every mutation in this app is a sequence of writes: change the state, then
 * append the audit row, often plus a notification. On the neon-http driver
 * each of those was its own implicit transaction, so any one could fail
 * alone — which is what made the audit trail best-effort rather than
 * guaranteed. A payment could be verified with no record of who verified it,
 * and nothing would ever notice.
 *
 * The fix was to route those writes through `inTransaction()`. This test
 * pins the pattern so the next action added to the file cannot quietly go
 * back to writing state and audit separately.
 *
 * It reads source rather than executing, deliberately: the point is to catch
 * a shape that unit tests with a mocked database cannot see. Whether the
 * database actually rolls back is proven by the integration tests that run
 * against real Postgres.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ACTIONS = readFileSync(join(process.cwd(), 'app', 'actions.ts'), 'utf8');
const ONBOARDING = readFileSync(join(process.cwd(), 'app', 'onboarding', 'actions.ts'), 'utf8');

describe('audit rows commit with the state they describe', () => {
  it('every audit() call receives a transaction handle, never the bare client', () => {
    const lines = ACTIONS.split(/\r?\n/);
    const offenders: string[] = [];

    lines.forEach((line, i) => {
      if (!/await audit\(/.test(line)) return;
      const inline = /await audit\((tx|db),/.test(line);
      const multiline = /await audit\($/.test(line.trim()) && /^\s*(tx|db),\s*$/.test(lines[i + 1] ?? '');
      if (!inline && !multiline) offenders.push(`line ${i + 1}: ${line.trim().slice(0, 80)}`);
    });

    expect(
      offenders,
      `audit() must be called with an explicit connection — pass the transaction handle ` +
      `so the entry commits with its state change:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('the only audit() call on the bare client is the deliberate no-op path', () => {
    // bulkImportMembers writes an audit row even when zero rows were
    // imported. There is nothing to be atomic with in that case, so `db` is
    // correct there — and it is the ONLY place that should be true.
    const bareCalls = [...ACTIONS.matchAll(/await audit\(db,/g)];
    expect(bareCalls).toHaveLength(1);
    const idx = ACTIONS.indexOf('await audit(db,');
    expect(ACTIONS.slice(idx, idx + 120)).toMatch(/bulk-import/);
  });

  it('the money actions each open a transaction', () => {
    const mustBeTransactional = [
      'recordPayment', 'submitDonation', 'verifyPayment',
      'supervisorApprovePayment', 'supervisorRejectPayment',
      'adminResendPaymentToSupervisor', 'adminDeletePayment',
      'issueLoan', 'recordRepayment', 'disburseCase',
      'castVote', 'adminResolveCase', 'adminDeleteCase', 'openFautiCase',
    ];
    const blocks = new Map(
      ACTIONS.split(/(?=^export async function )/m)
        .filter((b) => b.startsWith('export async function'))
        .map((b) => [/^export async function (\w+)/.exec(b)![1], b]),
    );

    const missing = mustBeTransactional.filter((name) => {
      const body = blocks.get(name);
      return !body || !/await inTransaction\(/.test(body);
    });
    expect(missing, `not transactional: ${missing.join(', ')}`).toEqual([]);
  });

  it('onboarding creates the member, its audit row and the invite spend together', () => {
    expect(ONBOARDING).toMatch(/await inTransaction\(/);
    // The invite counter must be consumed inside the transaction, otherwise a
    // member can be created while the invite keeps a use it already spent.
    const txBody = ONBOARDING.slice(ONBOARDING.lastIndexOf('await inTransaction('));
    expect(txBody).toMatch(/memberInvites/);
    expect(txBody).toMatch(/setup-complete/);
  });
});

describe('slow work stays out of transactions', () => {
  // A transaction holds a database connection. An email or WhatsApp call
  // inside one would hold that connection for the length of a third-party
  // HTTP request, and a provider outage would start rolling back payments.
  it('no external delivery call appears inside a transaction block', () => {
    const offenders: string[] = [];
    const lines = ACTIONS.split(/\r?\n/);
    let depth = 0;

    lines.forEach((line, i) => {
      if (/await inTransaction\(/.test(line)) depth = 1;
      if (depth > 0) {
        if (/\bsend(Email|ApprovalEmail|PaymentReceiptEmail|EmergencyCaseEmail)\b/.test(line)
          || /sendWhatsApp/.test(line)
          || /sendPushToMembers|broadcastPush/.test(line)
          || /emailFundApprovers|alertAdminsNewMember/.test(line)) {
          offenders.push(`line ${i + 1}: ${line.trim().slice(0, 70)}`);
        }
        if (/^\s{2}\}\);\s*$/.test(line)) depth = 0;
      }
    });

    expect(
      offenders,
      `External delivery inside a transaction holds a DB connection open for a ` +
      `third-party call. Move it to runAfterResponse() after the commit:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('notifications are dispatched through runAfterResponse, not inline', () => {
    expect(ACTIONS).toMatch(/runAfterResponse\(/);
    // The `void promise` pattern is what runAfterResponse replaced; on a
    // serverless platform it is dropped when the instance freezes.
    expect(ACTIONS).not.toMatch(/void \(async \(\) =>/);
  });
});

describe('castVote serialises voters on the same case', () => {
  it('takes a row lock before tallying', () => {
    const body = ACTIONS.split(/(?=^export async function )/m)
      .find((b) => b.startsWith('export async function castVote'))!;
    // Without FOR UPDATE two simultaneous voters can each read a tally that
    // excludes the other's vote, so a case sitting exactly on the threshold
    // fails to auto-resolve and then sits in 'voting' forever with the votes
    // needed to decide it already cast.
    expect(body).toMatch(/\.for\('update'\)/);
    // And the lock must be taken before the tally read, not after.
    expect(body.indexOf(".for('update')")).toBeLessThan(body.indexOf('yesCount'));
  });
});

/**
 * Regression: BH-25 / the state machine.
 *
 * A verified payment is money the fund has recognised as received. Deleting
 * the row would silently move the balance with nothing left to point at.
 * adminDeletePayment must VOID it — keeping the record, posting a
 * compensating ledger entry — and may only truly delete a payment that never
 * entered the books.
 */
describe('verified payments are voided, never deleted', () => {
  const body = ACTIONS.split(/(?=^export async function )/m)
    .find((b) => b.startsWith('export async function adminDeletePayment'))!;

  it('branches on the verified state rather than treating all payments alike', () => {
    expect(body).toMatch(/status === 'verified'/);
  });

  it('posts a ledger reversal on the verified path', () => {
    expect(body).toMatch(/reverseLedger\(/);
    expect(body).toMatch(/entryForSource\(/);
  });

  it('sets status to voided instead of deleting on the verified path', () => {
    // 'return;' also appears earlier (the not-found guard), so search from
    // the branch start rather than from the top of the function.
    const start = body.indexOf('if (wasVerified)');
    const verifiedBranch = body.slice(start, body.indexOf('return;', start));
    expect(verifiedBranch).toMatch(/status: 'voided'/);
    expect(verifiedBranch).not.toMatch(/\.delete\(/);
  });

  it('still deletes an unverified payment — nothing to preserve', () => {
    expect(body).toMatch(/tx\.delete\(payments\)/);
    expect(body).toMatch(/never entered the books/);
  });

  it('records the two outcomes as distinct audit actions', () => {
    expect(body).toMatch(/'payment-voided'/);
    expect(body).toMatch(/'payment-deleted'/);
  });
});

/**
 * With `voided` in the state machine, `pending_verify = false` no longer
 * means "verified" — a voided payment is also not pending. Every money read
 * must therefore name the state explicitly, or voided payments get counted
 * as contributions.
 */
describe('money reads name the verified state explicitly', () => {
  it('no money query relies on the derived boolean to mean "verified"', () => {
    const offenders: string[] = [];
    const roots = ['app', 'lib'];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
        if (!/\.tsx?$/.test(e.name)) continue;
        const src = readFileSync(p, 'utf8');
        if (src.includes('eq(payments.pendingVerify, false)')) offenders.push(p);
        if (/!\w+\.pendingVerify/.test(src)) offenders.push(p + ' (negated boolean)');
      }
    };
    for (const r of roots) walk(join(process.cwd(), r));
    expect(
      offenders,
      `These treat pending_verify = false as "verified", which now also matches ` +
      `voided payments. Use status === 'verified':\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
