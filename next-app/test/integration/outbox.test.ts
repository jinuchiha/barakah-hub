/**
 * Outbox guarantees, against real Postgres.
 *
 * The queue only helps if the database enforces what the code assumes:
 *
 *   · a dedupe key can only be queued once, so a replayed action or an
 *     overlapping cron cannot send the same notification twice
 *   · a message cannot claim to be sent without a send time
 *   · FOR UPDATE SKIP LOCKED really hands two workers disjoint work — the
 *     property that makes running the drain every 5 minutes safe even when
 *     one run overruns into the next
 *
 * Skipped when INTEGRATION_DATABASE_URL is unset.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Client } from 'pg';
import { hasDb, SKIP_REASON, connect, applyMigrations, makeMember } from './harness';

if (!hasDb) console.warn(`[integration] ${SKIP_REASON}`);

describe.skipIf(!hasDb)('outbox', () => {
  let db: Client;

  beforeAll(async () => {
    db = await connect();
    await applyMigrations(db, 'bh_outbox');
  }, 120_000);

  afterAll(async () => { await db?.end(); });

  const queue = (opts: { channel?: string; dedupe?: string | null; member?: string | null; due?: string } = {}) =>
    db.query(
      `INSERT INTO outbox_messages (channel, kind, payload, member_id, dedupe_key, next_attempt_at)
       VALUES ($1, 'test', '{"a":1}'::jsonb, $2, $3, COALESCE($4::timestamptz, now()))
       RETURNING id`,
      [opts.channel ?? 'email', opts.member ?? null, opts.dedupe ?? null, opts.due ?? null],
    );

  describe('dedupe', () => {
    it('refuses a second message with the same dedupe key', async () => {
      const key = `receipt:${Date.now()}`;
      await expect(queue({ dedupe: key })).resolves.toBeDefined();
      await expect(queue({ dedupe: key })).rejects.toThrow(/unique|duplicate/i);
    });

    it('leaves messages without a key unconstrained', async () => {
      // Most notifications are one-off and need no key; the index is partial
      // so they must not collide with each other.
      await expect(queue({ dedupe: null })).resolves.toBeDefined();
      await expect(queue({ dedupe: null })).resolves.toBeDefined();
    });
  });

  describe('sent/sent_at shape', () => {
    it('refuses a sent message with no send time', async () => {
      const { rows } = await queue();
      await expect(
        db.query(`UPDATE outbox_messages SET state = 'sent' WHERE id = $1`, [rows[0].id]),
      ).rejects.toThrow(/outbox_sent_shape|check/i);
    });

    it('refuses a pending message that claims a send time', async () => {
      const { rows } = await queue();
      await expect(
        db.query(`UPDATE outbox_messages SET sent_at = now() WHERE id = $1`, [rows[0].id]),
      ).rejects.toThrow(/outbox_sent_shape|check/i);
    });

    it('accepts state and time set together', async () => {
      const { rows } = await queue();
      await expect(
        db.query(`UPDATE outbox_messages SET state = 'sent', sent_at = now() WHERE id = $1`, [rows[0].id]),
      ).resolves.toBeDefined();
    });

    it('a dead message needs no send time', async () => {
      const { rows } = await queue();
      await expect(
        db.query(`UPDATE outbox_messages SET state = 'dead', last_error = 'x' WHERE id = $1`, [rows[0].id]),
      ).resolves.toBeDefined();
    });
  });

  describe('attempt counters', () => {
    it('refuses a negative attempt count', async () => {
      const { rows } = await queue();
      await expect(
        db.query('UPDATE outbox_messages SET attempts = -1 WHERE id = $1', [rows[0].id]),
      ).rejects.toThrow(/check/i);
    });

    it('refuses a zero max_attempts — a message that can never be tried', async () => {
      await expect(db.query(
        `INSERT INTO outbox_messages (channel, kind, max_attempts) VALUES ('email', 'k', 0)`,
      )).rejects.toThrow(/check/i);
    });
  });

  describe('the worker query', () => {
    it('returns only pending messages that are due', async () => {
      await applyMigrations(db, 'bh_outbox_due');
      await queue({ dedupe: 'due-now' });
      await queue({ dedupe: 'due-later', due: new Date(Date.now() + 3_600_000).toISOString() });
      const { rows: sentRows } = await queue({ dedupe: 'already-sent' });
      await db.query(`UPDATE outbox_messages SET state='sent', sent_at=now() WHERE id=$1`, [sentRows[0].id]);

      const { rows } = await db.query(
        `SELECT dedupe_key FROM outbox_messages
         WHERE state = 'pending' AND next_attempt_at <= now()
         ORDER BY next_attempt_at`,
      );
      expect(rows.map((r) => r.dedupe_key)).toEqual(['due-now']);
    }, 120_000);

    it('SKIP LOCKED gives two concurrent workers disjoint work', async () => {
      await applyMigrations(db, 'bh_outbox_lock');
      for (let i = 0; i < 4; i++) await queue({ dedupe: `m${i}` });

      // Worker A claims two rows inside an open transaction.
      await db.query('BEGIN');
      const a = await db.query(
        `SELECT id FROM outbox_messages WHERE state='pending' AND next_attempt_at <= now()
         ORDER BY next_attempt_at LIMIT 2 FOR UPDATE SKIP LOCKED`,
      );
      expect(a.rows).toHaveLength(2);

      // Worker B, on its own connection, must get the OTHER two rather than
      // blocking or re-claiming A's. Without SKIP LOCKED an overlapping cron
      // run would double-send.
      const other = await connect();
      try {
        await other.query(`SET search_path TO bh_outbox_lock`);
        const b = await other.query(
          `SELECT id FROM outbox_messages WHERE state='pending' AND next_attempt_at <= now()
           ORDER BY next_attempt_at LIMIT 2 FOR UPDATE SKIP LOCKED`,
        );
        expect(b.rows).toHaveLength(2);
        const overlap = b.rows.filter((r) => a.rows.some((x) => x.id === r.id));
        expect(overlap).toHaveLength(0);
      } finally {
        await other.end();
        await db.query('COMMIT');
      }
    }, 120_000);
  });

  describe('cascade', () => {
    it('queued messages go with the member', async () => {
      await applyMigrations(db, 'bh_outbox_cascade');
      const member = await makeMember(db);
      await queue({ member, dedupe: 'for-member' });
      await db.query('DELETE FROM members WHERE id = $1', [member]);
      const { rows } = await db.query('SELECT 1 FROM outbox_messages WHERE member_id = $1', [member]);
      // Unlike audit_log and ledger_entries, a pending notification for a
      // deleted member is worthless — there is nobody to deliver it to.
      expect(rows).toHaveLength(0);
    }, 120_000);
  });
});
