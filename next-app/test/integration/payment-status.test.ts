/**
 * The payment state machine, against real Postgres.
 *
 * A payment's state used to be spread across five nullable columns — 2^5
 * representable combinations, of which four were meaningful and the rest
 * were nonsense the database happily stored: approved AND rejected at once,
 * verified while still pending, rejected with a verifier attached. Nothing
 * prevented any of it, and every read site decoded the state by hand.
 *
 * Migration 0019 makes the state explicit and lets the database enforce it.
 * These tests prove the enforcement is real, which is the whole point — a
 * state machine that only exists in application code is a convention, not a
 * guarantee.
 *
 * Skipped when INTEGRATION_DATABASE_URL is unset.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Client } from 'pg';
import { hasDb, SKIP_REASON, connect, applyMigrations, applyFiles, makeMember } from './harness';

if (!hasDb) console.warn(`[integration] ${SKIP_REASON}`);

describe.skipIf(!hasDb)('payment state machine', () => {
  let db: Client;

  beforeAll(async () => {
    db = await connect();
    await applyMigrations(db, 'bh_status');
  }, 120_000);

  afterAll(async () => { await db?.end(); });

  async function newPayment(status = 'submitted'): Promise<string> {
    const member = await makeMember(db);
    const { rows } = await db.query(
      `INSERT INTO payments (member_id, amount, month_label, month_start, status)
       VALUES ($1, 100, 'May 2026', '2026-05-01', $2) RETURNING id`,
      [member, status],
    );
    return rows[0].id as string;
  }

  const setStatus = (id: string, status: string, extra = '') =>
    db.query(`UPDATE payments SET status = $2${extra} WHERE id = $1`, [id, status]);

  describe('legal transitions', () => {
    it('submitted → supervisor_approved', async () => {
      const id = await newPayment();
      await expect(setStatus(id, 'supervisor_approved', ', supervisor_approved_at = now()')).resolves.toBeDefined();
    });

    it('submitted → supervisor_rejected', async () => {
      const id = await newPayment();
      await expect(setStatus(id, 'supervisor_rejected', ', supervisor_rejected_at = now()')).resolves.toBeDefined();
    });

    it('supervisor_approved → verified', async () => {
      const id = await newPayment('supervisor_approved');
      await expect(setStatus(id, 'verified', ', verified_at = now()')).resolves.toBeDefined();
    });

    it('supervisor_rejected → submitted (admin resend)', async () => {
      const id = await newPayment('supervisor_rejected');
      await expect(setStatus(id, 'submitted', ', supervisor_rejected_at = NULL')).resolves.toBeDefined();
    });

    it('supervisor_approved → supervisor_rejected (supervisor changes their mind)', async () => {
      const id = await newPayment('supervisor_approved');
      await expect(setStatus(id, 'supervisor_rejected',
        ', supervisor_approved_at = NULL, supervisor_rejected_at = now()')).resolves.toBeDefined();
    });

    it('verified → voided', async () => {
      const id = await newPayment('verified');
      await expect(setStatus(id, 'voided')).resolves.toBeDefined();
    });
  });

  describe('illegal transitions are refused by the database', () => {
    // The one that matters most. Money recognised as received can be
    // REVERSED — with a compensating ledger entry — but never quietly
    // un-recognised by moving the row back to an earlier state.
    it('verified ⇸ submitted', async () => {
      const id = await newPayment('verified');
      await expect(setStatus(id, 'submitted')).rejects.toThrow(/illegal payment status transition/i);
    });

    it('verified ⇸ supervisor_approved', async () => {
      const id = await newPayment('verified');
      await expect(setStatus(id, 'supervisor_approved')).rejects.toThrow(/illegal/i);
    });

    it('verified ⇸ supervisor_rejected', async () => {
      const id = await newPayment('verified');
      await expect(setStatus(id, 'supervisor_rejected')).rejects.toThrow(/illegal/i);
    });

    it('submitted ⇸ verified — the supervisor step cannot be skipped', async () => {
      const id = await newPayment();
      await expect(setStatus(id, 'verified', ', verified_at = now()')).rejects.toThrow(/illegal/i);
    });

    it('supervisor_rejected ⇸ verified — a rejection must be resent first', async () => {
      const id = await newPayment('supervisor_rejected');
      await expect(setStatus(id, 'verified', ', verified_at = now()')).rejects.toThrow(/illegal/i);
    });

    it('voided is terminal', async () => {
      const id = await newPayment('verified');
      await setStatus(id, 'voided');
      for (const target of ['submitted', 'supervisor_approved', 'verified']) {
        await expect(setStatus(id, target)).rejects.toThrow(/illegal/i);
      }
    });

    it('names both states so the failure is diagnosable', async () => {
      const id = await newPayment('verified');
      await expect(setStatus(id, 'submitted')).rejects.toThrow(/verified -> submitted/);
    });
  });

  describe('the flags cannot contradict the status', () => {
    it('refuses a submitted payment that carries an approval', async () => {
      const member = await makeMember(db);
      await expect(db.query(
        `INSERT INTO payments (member_id, amount, month_label, month_start, status, supervisor_approved_at)
         VALUES ($1, 100, 'May 2026', '2026-05-01', 'submitted', now())`,
        [member],
      )).rejects.toThrow(/payments_status_shape|check/i);
    });

    it('refuses approved AND rejected at the same time', async () => {
      const member = await makeMember(db);
      await expect(db.query(
        `INSERT INTO payments (member_id, amount, month_label, month_start, status,
                               supervisor_approved_at, supervisor_rejected_at)
         VALUES ($1, 100, 'May 2026', '2026-05-01', 'supervisor_approved', now(), now())`,
        [member],
      )).rejects.toThrow(/payments_status_shape|check/i);
    });

    it('refuses a verification timestamp on an unverified payment', async () => {
      const member = await makeMember(db);
      await expect(db.query(
        `INSERT INTO payments (member_id, amount, month_label, month_start, status, verified_at)
         VALUES ($1, 100, 'May 2026', '2026-05-01', 'submitted', now())`,
        [member],
      )).rejects.toThrow(/payments_status_shape|check/i);
    });
  });

  describe('pending_verify is derived, not stored', () => {
    it('cannot be written directly — there is only one source of truth', async () => {
      const member = await makeMember(db);
      await expect(db.query(
        `INSERT INTO payments (member_id, amount, month_label, month_start, pending_verify)
         VALUES ($1, 100, 'May 2026', '2026-05-01', true)`,
        [member],
      )).rejects.toThrow(/generated|cannot insert/i);
    });

    it('tracks the status automatically', async () => {
      const id = await newPayment();
      const read = async () => (await db.query('SELECT pending_verify FROM payments WHERE id = $1', [id])).rows[0].pending_verify;

      expect(await read()).toBe(true); // submitted
      await setStatus(id, 'supervisor_approved', ', supervisor_approved_at = now()');
      expect(await read()).toBe(true); // still in the queue
      await setStatus(id, 'verified', ', verified_at = now()');
      expect(await read()).toBe(false); // verified
    });

    it('is false for a voided payment — which is why money reads use status, not this flag', async () => {
      const id = await newPayment('verified');
      await setStatus(id, 'voided');
      const { rows } = await db.query('SELECT pending_verify, status FROM payments WHERE id = $1', [id]);
      expect(rows[0].status).toBe('voided');
      // A voided payment is NOT pending — but it is not a contribution
      // either. `pending_verify = false` therefore no longer means
      // "verified", which is why every money query was moved to
      // `status = 'verified'`.
      expect(rows[0].pending_verify).toBe(false);
    });
  });

  describe('backfill from the pre-0019 representation', () => {
    it('derives each state from the old columns', async () => {
      await applyMigrations(db, 'bh_status_bf', { stopBefore: '0019_payment_state_machine.sql' });
      const member = await makeMember(db);

      // The four states the old five-column encoding could express.
      await db.query(
        `INSERT INTO payments (member_id, amount, month_label, month_start, pending_verify,
                               supervisor_approved_at, supervisor_rejected_at, verified_at)
         VALUES
           ($1, 10, 'A', '2026-01-01', true,  NULL,  NULL,  NULL),
           ($1, 20, 'B', '2026-01-01', true,  now(), NULL,  NULL),
           ($1, 30, 'C', '2026-01-01', true,  NULL,  now(), NULL),
           ($1, 40, 'D', '2026-01-01', false, now(), NULL,  now())`,
        [member],
      );

      await applyFiles(db, ['0019_payment_state_machine.sql']);

      const { rows } = await db.query('SELECT month_label, status FROM payments ORDER BY month_label');
      expect(rows.map((r) => [r.month_label, r.status])).toEqual([
        ['A', 'submitted'],
        ['B', 'supervisor_approved'],
        ['C', 'supervisor_rejected'],
        ['D', 'verified'],
      ]);
    }, 120_000);
  });
});
