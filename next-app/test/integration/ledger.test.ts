/**
 * Ledger invariants, against a real Postgres.
 *
 * The ledger replaces `SUM(verified payments)` as the definition of what the
 * fund holds. That only helps if the database actually enforces the
 * properties the application assumes:
 *
 *   · append-only, including against TRUNCATE
 *   · one entry per source row, so a replay cannot credit twice
 *   · a reversal must name what it reverses, and nothing else may
 *   · zero-amount entries are meaningless and refused
 *   · balance = SUM(amount), and it goes down when money leaves
 *
 * Skipped when INTEGRATION_DATABASE_URL is unset.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Client } from 'pg';
import { hasDb, SKIP_REASON, connect, applyMigrations, applyFiles, makeMember } from './harness';

/** Does a table exist in the current search_path? */
async function tableExists(client: Client, name: string): Promise<boolean> {
  const { rows } = await client.query('SELECT to_regclass($1) AS t', [name]);
  return rows[0].t !== null;
}

if (!hasDb) console.warn(`[integration] ${SKIP_REASON}`);

describe.skipIf(!hasDb)('ledger', () => {
  let db: Client;

  beforeAll(async () => {
    db = await connect();
    await applyMigrations(db, 'bh_ledger');
  }, 120_000);

  afterAll(async () => { await db?.end(); });

  const insertEntry = (db: Client, cols: string, vals: unknown[], placeholders: string) =>
    db.query(`INSERT INTO ledger_entries (${cols}) VALUES (${placeholders}) RETURNING id`, vals);

  describe('append-only', () => {
    it('accepts INSERT', async () => {
      const m = await makeMember(db);
      await expect(insertEntry(db,
        'pool, amount, source_type, source_id, member_id',
        ['sadaqah', 100, 'payment', crypto.randomUUID(), m],
        '$1,$2,$3,$4,$5',
      )).resolves.toBeDefined();
    });

    it('blocks UPDATE — a balance you can edit is not a balance', async () => {
      const m = await makeMember(db);
      const { rows } = await insertEntry(db,
        'pool, amount, source_type, source_id, member_id',
        ['sadaqah', 100, 'payment', crypto.randomUUID(), m], '$1,$2,$3,$4,$5');
      await expect(db.query('UPDATE ledger_entries SET amount = 999 WHERE id = $1', [rows[0].id]))
        .rejects.toThrow(/append-only/i);
    });

    it('blocks DELETE', async () => {
      const m = await makeMember(db);
      const { rows } = await insertEntry(db,
        'pool, amount, source_type, source_id, member_id',
        ['sadaqah', 100, 'payment', crypto.randomUUID(), m], '$1,$2,$3,$4,$5');
      await expect(db.query('DELETE FROM ledger_entries WHERE id = $1', [rows[0].id]))
        .rejects.toThrow(/append-only/i);
    });

    it('blocks TRUNCATE', async () => {
      await expect(db.query('TRUNCATE ledger_entries')).rejects.toThrow(/append-only/i);
    });

    it('tells the caller to post a reversal instead', async () => {
      await expect(db.query('TRUNCATE ledger_entries')).rejects.toThrow(/reversal/i);
    });
  });

  describe('one entry per source row', () => {
    it('refuses a second entry for the same payment', async () => {
      const m = await makeMember(db);
      const sourceId = crypto.randomUUID();
      const post = () => insertEntry(db,
        'pool, amount, source_type, source_id, member_id',
        ['sadaqah', 500, 'payment', sourceId, m], '$1,$2,$3,$4,$5');
      await expect(post()).resolves.toBeDefined();
      // This is what makes posting idempotent: a retried verification or a
      // double-fired cron cannot credit the same payment twice.
      await expect(post()).rejects.toThrow(/unique|duplicate/i);
    });

    it('scopes uniqueness by source_type, so a loan and a payment may share an id', async () => {
      const m = await makeMember(db);
      const sourceId = crypto.randomUUID();
      await expect(insertEntry(db, 'pool, amount, source_type, source_id, member_id',
        ['qarz', 100, 'payment', sourceId, m], '$1,$2,$3,$4,$5')).resolves.toBeDefined();
      await expect(insertEntry(db, 'pool, amount, source_type, source_id, member_id',
        ['qarz', -100, 'loan_issue', sourceId, m], '$1,$2,$3,$4,$5')).resolves.toBeDefined();
    });

    it('allows many reversals — they are excluded from the unique index', async () => {
      const m = await makeMember(db);
      const { rows: a } = await insertEntry(db, 'pool, amount, source_type, source_id, member_id',
        ['sadaqah', 100, 'payment', crypto.randomUUID(), m], '$1,$2,$3,$4,$5');
      const { rows: b } = await insertEntry(db, 'pool, amount, source_type, source_id, member_id',
        ['sadaqah', 200, 'payment', crypto.randomUUID(), m], '$1,$2,$3,$4,$5');
      for (const orig of [a[0].id, b[0].id]) {
        await expect(db.query(
          `INSERT INTO ledger_entries (pool, amount, source_type, reverses_id) VALUES ('sadaqah', -1, 'reversal', $1)`,
          [orig],
        )).resolves.toBeDefined();
      }
    });
  });

  describe('shape constraints', () => {
    it('refuses a zero amount', async () => {
      const m = await makeMember(db);
      await expect(insertEntry(db, 'pool, amount, source_type, source_id, member_id',
        ['sadaqah', 0, 'payment', crypto.randomUUID(), m], '$1,$2,$3,$4,$5'))
        .rejects.toThrow(/check/i);
    });

    it('refuses a reversal that names nothing', async () => {
      await expect(db.query(
        `INSERT INTO ledger_entries (pool, amount, source_type) VALUES ('sadaqah', -100, 'reversal')`,
      )).rejects.toThrow(/check|ledger_reversal_shape/i);
    });

    it('refuses a non-reversal that names something to reverse', async () => {
      const m = await makeMember(db);
      const { rows } = await insertEntry(db, 'pool, amount, source_type, source_id, member_id',
        ['sadaqah', 100, 'payment', crypto.randomUUID(), m], '$1,$2,$3,$4,$5');
      await expect(db.query(
        `INSERT INTO ledger_entries (pool, amount, source_type, source_id, reverses_id)
         VALUES ('sadaqah', 100, 'payment', $1, $2)`,
        [crypto.randomUUID(), rows[0].id],
      )).rejects.toThrow(/check|ledger_reversal_shape/i);
    });
  });

  describe('balance arithmetic', () => {
    it('nets inflow against outflow per pool', async () => {
      await applyMigrations(db, 'bh_ledger_bal');
      const m = await makeMember(db);
      const add = (pool: string, amount: number, type: string) => insertEntry(db,
        'pool, amount, source_type, source_id, member_id',
        [pool, amount, type, crypto.randomUUID(), m], '$1,$2,$3,$4,$5');

      await add('sadaqah', 1000, 'payment');
      await add('sadaqah', 500, 'payment');
      await add('sadaqah', -300, 'case_disbursement');
      await add('qarz', 2000, 'payment');
      await add('qarz', -800, 'loan_issue');
      await add('qarz', 200, 'loan_repayment');

      const { rows } = await db.query(
        `SELECT pool, SUM(amount)::int AS balance FROM ledger_entries GROUP BY pool ORDER BY pool`,
      );
      const byPool = Object.fromEntries(rows.map((r) => [r.pool, r.balance]));
      expect(byPool.sadaqah).toBe(1200); // 1000 + 500 − 300
      expect(byPool.qarz).toBe(1400);    // 2000 − 800 + 200
    }, 120_000);

    it('a reversal restores the prior balance exactly', async () => {
      await applyMigrations(db, 'bh_ledger_rev');
      const m = await makeMember(db);
      const { rows } = await insertEntry(db, 'pool, amount, source_type, source_id, member_id',
        ['zakat', 750, 'payment', crypto.randomUUID(), m], '$1,$2,$3,$4,$5');

      const before = await db.query(`SELECT COALESCE(SUM(amount),0)::int AS b FROM ledger_entries WHERE pool='zakat'`);
      expect(before.rows[0].b).toBe(750);

      await db.query(
        `INSERT INTO ledger_entries (pool, amount, source_type, reverses_id) VALUES ('zakat', -750, 'reversal', $1)`,
        [rows[0].id],
      );

      const after = await db.query(`SELECT COALESCE(SUM(amount),0)::int AS b FROM ledger_entries WHERE pool='zakat'`);
      expect(after.rows[0].b).toBe(0);
      // And the original is still there — corrected, not erased.
      const orig = await db.query('SELECT amount FROM ledger_entries WHERE id = $1', [rows[0].id]);
      expect(orig.rows[0].amount).toBe(750);
    }, 120_000);
  });

  describe('backfill (the upgrade path a real deployment takes)', () => {
    it('derives opening balances from records that predate the ledger', async () => {
      // Stand up the schema as it was BEFORE 0018, populate it with the kind
      // of history a live fund already has, and only then apply the ledger
      // migration. Anything less would be testing the backfill against an
      // empty database, which proves nothing.
      await applyMigrations(db, 'bh_ledger_bf', { stopBefore: '0018_ledger.sql' });

      const borrower = await makeMember(db, { username: 'bf_borrower' });
      const donor = await makeMember(db, { username: 'bf_donor' });

      await db.query(
        `INSERT INTO payments (member_id, amount, pool, month_label, month_start, pending_verify)
         VALUES ($1, 1000, 'sadaqah', 'May 2026', '2026-05-01', false),
                ($1, 250,  'zakat',   'May 2026', '2026-05-01', false),
                ($1, 400,  'sadaqah', 'Jun 2026', '2026-06-01', true)`,
        [donor],
      );

      const { rows: loanRows } = await db.query(
        `INSERT INTO loans (member_id, amount, purpose) VALUES ($1, 600, 'seeds') RETURNING id`,
        [borrower],
      );
      await db.query(
        `INSERT INTO repayments (loan_id, amount) VALUES ($1, 150)`,
        [loanRows[0].id],
      );

      // A disbursed GIFT case (money out) and a disbursed QARZ case (whose
      // outflow is represented by its loan, not the case).
      await db.query(
        `INSERT INTO cases (applicant_id, case_type, pool, category, beneficiary_name, amount, reason_ur, reason_en, status, resolved_at)
         VALUES ($1, 'gift', 'sadaqah', 'medical', 'Ward', 200, 'u', 'e', 'disbursed', now())`,
        [borrower],
      );

      expect(await tableExists(db, 'ledger_entries')).toBe(false);

      // The upgrade.
      await applyFiles(db, ['0018_ledger.sql']);

      const { rows } = await db.query(
        `SELECT pool, SUM(amount)::int AS balance FROM ledger_entries GROUP BY pool`,
      );
      const byPool = Object.fromEntries(rows.map((r) => [r.pool, r.balance]));

      // sadaqah: 1000 verified in − 200 gift out = 800.
      // The 400 PENDING payment is deliberately excluded: it is a claim, not
      // money received, and crediting it would overstate the fund.
      expect(byPool.sadaqah).toBe(800);
      expect(byPool.zakat).toBe(250);
      // qarz: 600 lent out, 150 repaid = −450.
      expect(byPool.qarz).toBe(-450);
    }, 120_000);

    it('is safe to re-run — the ledger-less recovery path', async () => {
      // Applying 0018 twice must not double every entry.
      const before = await db.query('SELECT COUNT(*)::int AS n FROM ledger_entries');
      await applyFiles(db, ['0018_ledger.sql']);
      const after = await db.query('SELECT COUNT(*)::int AS n FROM ledger_entries');
      expect(after.rows[0].n).toBe(before.rows[0].n);
    }, 120_000);
  });
});
