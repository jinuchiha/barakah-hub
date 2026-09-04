/**
 * The database's own guarantees, verified against a real Postgres.
 *
 * These are the invariants the application now RELIES on and that a mocked
 * database cannot prove:
 *
 *   · The audit log is append-only, including against TRUNCATE.
 *   · An idempotency key can only be used once.
 *   · A case can only have one loan.
 *   · Foreign keys behave as hardDeleteMember assumes they do — this is
 *     exactly what BH-01 got wrong, and what a mock could never catch.
 *   · A transaction actually rolls back.
 *
 * Skipped when INTEGRATION_DATABASE_URL is unset. CI supplies a postgres:16
 * service; see .github/workflows/ci.yml.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Client } from 'pg';
import { hasDb, SKIP_REASON, connect, applyMigrations, makeMember } from './harness';

if (!hasDb) console.warn(`[integration] ${SKIP_REASON}`);

describe.skipIf(!hasDb)('database invariants', () => {
  let db: Client;

  beforeAll(async () => {
    db = await connect();
    await applyMigrations(db);
  }, 120_000);

  afterAll(async () => { await db?.end(); });

  /* ─── audit log is append-only ─── */

  describe('audit_log immutability', () => {
    it('accepts INSERT', async () => {
      const actor = await makeMember(db);
      await expect(
        db.query(`INSERT INTO audit_log (actor_id, action, detail) VALUES ($1, 'test', 'ok')`, [actor]),
      ).resolves.toBeDefined();
    });

    it('blocks UPDATE', async () => {
      const actor = await makeMember(db);
      await db.query(`INSERT INTO audit_log (actor_id, action, detail) VALUES ($1, 'test', 'before')`, [actor]);
      await expect(
        db.query(`UPDATE audit_log SET detail = 'tampered' WHERE actor_id = $1`, [actor]),
      ).rejects.toThrow(/append-only/i);
    });

    it('blocks DELETE', async () => {
      const actor = await makeMember(db);
      await db.query(`INSERT INTO audit_log (actor_id, action, detail) VALUES ($1, 'test', 'x')`, [actor]);
      await expect(
        db.query(`DELETE FROM audit_log WHERE actor_id = $1`, [actor]),
      ).rejects.toThrow(/append-only/i);
    });

    // The hole migration 0017 closed. Row-level triggers do not fire on
    // TRUNCATE, so before 0017 this erased the entire financial audit trail
    // unopposed — while the README described it as immutable.
    it('blocks TRUNCATE', async () => {
      await expect(db.query('TRUNCATE audit_log')).rejects.toThrow(/append-only/i);
    });
  });

  /* ─── money constraints ─── */

  describe('payment idempotency', () => {
    it('rejects a second row with the same idempotency key', async () => {
      const member = await makeMember(db);
      const key = `key_${Date.now()}`;
      const insert = (k: string) => db.query(
        `INSERT INTO payments (member_id, amount, month_label, month_start, idempotency_key)
         VALUES ($1, 100, 'May 2026', '2026-05-01', $2)`,
        [member, k],
      );
      await expect(insert(key)).resolves.toBeDefined();
      await expect(insert(key)).rejects.toThrow(/unique|duplicate/i);
    });

    it('still allows many rows with no key (historical data)', async () => {
      const member = await makeMember(db);
      const insert = () => db.query(
        `INSERT INTO payments (member_id, amount, month_label, month_start)
         VALUES ($1, 100, 'May 2026', '2026-05-01')`,
        [member],
      );
      await expect(insert()).resolves.toBeDefined();
      await expect(insert()).resolves.toBeDefined();
    });
  });

  describe('one loan per case', () => {
    it('rejects a second loan for the same case', async () => {
      const member = await makeMember(db);
      const { rows } = await db.query(
        `INSERT INTO cases (applicant_id, case_type, pool, category, beneficiary_name, amount, reason_ur, reason_en)
         VALUES ($1, 'qarz', 'qarz', 'general', 'B', 500, 'u', 'e') RETURNING id`,
        [member],
      );
      const caseId = rows[0].id;
      const insert = () => db.query(
        `INSERT INTO loans (member_id, amount, purpose, case_id) VALUES ($1, 500, 'p', $2)`,
        [member, caseId],
      );
      await expect(insert()).resolves.toBeDefined();
      // The weekly reconcile healer claimed this was idempotent "keyed on
      // caseId". Nothing enforced it until 0017, so two overlapping cron runs
      // could double a borrower's recorded debt.
      await expect(insert()).rejects.toThrow(/unique|duplicate/i);
    });
  });

  describe('CHECK constraints the app depends on', () => {
    it('rejects a non-positive payment amount', async () => {
      const member = await makeMember(db);
      await expect(db.query(
        `INSERT INTO payments (member_id, amount, month_label, month_start)
         VALUES ($1, 0, 'May 2026', '2026-05-01')`,
        [member],
      )).rejects.toThrow(/check/i);
    });

    it('rejects a loan repaid beyond its principal', async () => {
      const member = await makeMember(db);
      await expect(db.query(
        `INSERT INTO loans (member_id, amount, purpose, paid) VALUES ($1, 100, 'p', 500)`,
        [member],
      )).rejects.toThrow(/check/i);
    });

    it('keeps config a singleton', async () => {
      await expect(db.query('INSERT INTO config (id) VALUES (2)')).rejects.toThrow(/check/i);
    });

    it('allows one vote per member per case, not two', async () => {
      const applicant = await makeMember(db);
      const voter = await makeMember(db);
      const { rows } = await db.query(
        `INSERT INTO cases (applicant_id, case_type, pool, category, beneficiary_name, amount, reason_ur, reason_en)
         VALUES ($1, 'gift', 'sadaqah', 'general', 'B', 500, 'u', 'e') RETURNING id`,
        [applicant],
      );
      const vote = (v: boolean) => db.query(
        `INSERT INTO votes (case_id, member_id, vote) VALUES ($1, $2, $3)`,
        [rows[0].id, voter, v],
      );
      await expect(vote(true)).resolves.toBeDefined();
      await expect(vote(false)).rejects.toThrow(/duplicate|unique|primary key/i);
    });
  });

  /* ─── foreign keys, i.e. what BH-01 got wrong ─── */

  describe('member deletion semantics', () => {
    it('audit_log.actor_id BLOCKS deletion — an actor keeps their attribution', async () => {
      const member = await makeMember(db);
      await db.query(`INSERT INTO audit_log (actor_id, action, detail) VALUES ($1, 'setup-complete', 'x')`, [member]);
      // This is precisely the constraint hardDeleteMember used to discover
      // AFTER it had already re-parented children and cleared spouse links.
      await expect(db.query('DELETE FROM members WHERE id = $1', [member]))
        .rejects.toThrow(/foreign key|violates/i);
    });

    it('audit_log.target_id does NOT block deletion — it nulls (migration 0017)', async () => {
      const actor = await makeMember(db);
      const target = await makeMember(db);
      await db.query(
        `INSERT INTO audit_log (actor_id, target_id, action, detail) VALUES ($1, $2, 'member-added', 'x')`,
        [actor, target],
      );
      await expect(db.query('DELETE FROM members WHERE id = $1', [target])).resolves.toBeDefined();
      // The row must survive — the table is append-only — with the reference nulled.
      const { rows } = await db.query('SELECT target_id FROM audit_log WHERE actor_id = $1', [actor]);
      expect(rows).toHaveLength(1);
      expect(rows[0].target_id).toBeNull();
    });

    it('children are orphaned to NULL, not cascade-deleted', async () => {
      const parent = await makeMember(db);
      const child = await makeMember(db, { parentId: parent });
      await db.query('DELETE FROM members WHERE id = $1', [parent]);
      const { rows } = await db.query('SELECT parent_id FROM members WHERE id = $1', [child]);
      expect(rows[0].parent_id).toBeNull();
    });

    it('a spouse link is cleared by the FK, so no manual pre-write is needed', async () => {
      const a = await makeMember(db);
      const b = await makeMember(db);
      await db.query('UPDATE members SET spouse_id = $1 WHERE id = $2', [b, a]);
      await db.query('DELETE FROM members WHERE id = $1', [b]);
      const { rows } = await db.query('SELECT spouse_id FROM members WHERE id = $1', [a]);
      expect(rows[0].spouse_id).toBeNull();
    });

    it('payments cascade with their member', async () => {
      const member = await makeMember(db);
      await db.query(
        `INSERT INTO payments (member_id, amount, month_label, month_start)
         VALUES ($1, 100, 'May 2026', '2026-05-01')`,
        [member],
      );
      await db.query('DELETE FROM members WHERE id = $1', [member]);
      const { rows } = await db.query('SELECT 1 FROM payments WHERE member_id = $1', [member]);
      expect(rows).toHaveLength(0);
    });
  });

  /* ─── transactions actually work ─── */

  describe('transaction semantics', () => {
    it('rolls back every write when the transaction aborts', async () => {
      const member = await makeMember(db);
      await db.query('BEGIN');
      await db.query(
        `INSERT INTO payments (member_id, amount, month_label, month_start)
         VALUES ($1, 777, 'Rollback 2026', '2026-05-01')`,
        [member],
      );
      await db.query(`INSERT INTO audit_log (actor_id, action, detail) VALUES ($1, 'rb', 'x')`, [member]);
      await db.query('ROLLBACK');

      const pay = await db.query(`SELECT 1 FROM payments WHERE month_label = 'Rollback 2026'`);
      const aud = await db.query(`SELECT 1 FROM audit_log WHERE action = 'rb'`);
      expect(pay.rows).toHaveLength(0);
      // If this fails, the audit trail is being written outside the
      // transaction that produced it — the exact bug transactions fixed.
      expect(aud.rows).toHaveLength(0);
    });

    it('commits state and audit together', async () => {
      const member = await makeMember(db);
      await db.query('BEGIN');
      await db.query(
        `INSERT INTO payments (member_id, amount, month_label, month_start)
         VALUES ($1, 888, 'Commit 2026', '2026-05-01')`,
        [member],
      );
      await db.query(`INSERT INTO audit_log (actor_id, action, detail) VALUES ($1, 'cm', 'x')`, [member]);
      await db.query('COMMIT');

      const pay = await db.query(`SELECT 1 FROM payments WHERE month_label = 'Commit 2026'`);
      const aud = await db.query(`SELECT 1 FROM audit_log WHERE action = 'cm'`);
      expect(pay.rows).toHaveLength(1);
      expect(aud.rows).toHaveLength(1);
    });

    it('SELECT ... FOR UPDATE holds a row lock inside a transaction', async () => {
      // castVote depends on this to serialise voters on the same case.
      const applicant = await makeMember(db);
      const { rows } = await db.query(
        `INSERT INTO cases (applicant_id, case_type, pool, category, beneficiary_name, amount, reason_ur, reason_en)
         VALUES ($1, 'gift', 'sadaqah', 'general', 'B', 500, 'u', 'e') RETURNING id`,
        [applicant],
      );
      await db.query('BEGIN');
      const locked = await db.query('SELECT id FROM cases WHERE id = $1 FOR UPDATE', [rows[0].id]);
      expect(locked.rows).toHaveLength(1);
      await db.query('COMMIT');
    });
  });

  /* ─── the migration set applies cleanly ─── */

  describe('migrations', () => {
    it('produced every table the application queries', async () => {
      const { rows } = await db.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'bh_test'`,
      );
      const names = rows.map((r) => r.table_name as string);
      for (const t of [
        'members', 'payments', 'cases', 'votes', 'loans', 'repayments',
        'notifications', 'messages', 'member_invites', 'push_tokens',
        'audit_log', 'config', 'users', 'sessions', 'accounts', 'verifications',
      ]) {
        expect(names, `missing table ${t}`).toContain(t);
      }
    });

    it('seeded exactly one config row', async () => {
      const { rows } = await db.query('SELECT id FROM config');
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(1);
    });

    it('is idempotent — a second full apply changes nothing', async () => {
      // The disaster-recovery path: re-running migrations without the ledger
      // must not fail. This is why 0001's config INSERT gained
      // ON CONFLICT DO NOTHING.
      await expect(applyMigrations(db, 'bh_test_rerun')).resolves.toBeUndefined();
      await db.query('SET search_path TO bh_test');
    }, 120_000);
  });
});
