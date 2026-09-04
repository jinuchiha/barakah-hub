/**
 * Regression tests for the migration runner's SQL handling (BH-13) and for
 * the shape of the migration set itself.
 *
 * Two failure modes these guard:
 *
 *  · The statement splitter has to respect dollar-quoted function bodies. If
 *    it splits inside one, a migration that defines a trigger function is cut
 *    into fragments and the run fails in a way that is hard to read. The
 *    audit-log immutability triggers live inside exactly such a body.
 *
 *  · Uniqueness violations used to be tolerated for EVERY statement of EVERY
 *    migration, so a future data backfill that hit a unique constraint would
 *    be silently swallowed and the migration then recorded as applied — the
 *    schema reports "done" while the data is wrong.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitStatements, isTolerable } from '../scripts/migration-sql';

const DIR = join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();

describe('splitStatements', () => {
  it('splits plain statements on semicolons', () => {
    expect(splitStatements('SELECT 1; SELECT 2;')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('does NOT split inside a dollar-quoted function body', () => {
    const sql = `
CREATE OR REPLACE FUNCTION f() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'no; semicolons; here';
END;
$$;
SELECT 1;`;
    const out = splitStatements(sql);
    expect(out).toHaveLength(2);
    expect(out[0]).toContain('RAISE EXCEPTION');
    expect(out[0]).toContain('END;');
    expect(out[1]).toBe('SELECT 1');
  });

  it('handles tagged dollar quotes', () => {
    const sql = `CREATE FUNCTION g() RETURNS void AS $body$ BEGIN; END; $body$; SELECT 2;`;
    expect(splitStatements(sql)).toHaveLength(2);
  });

  it('ignores semicolons inside line comments', () => {
    const out = splitStatements('-- a; b; c\nSELECT 1;');
    expect(out).toHaveLength(1);
  });
});

describe('isTolerable — uniqueness is no longer blanket-tolerated', () => {
  const uniqueErr = new Error('duplicate key value violates unique constraint "x_uidx"');

  it('tolerates a unique violation ONLY when the statement declares idempotence', () => {
    expect(isTolerable(uniqueErr, 'INSERT INTO config (id) VALUES (1) ON CONFLICT DO NOTHING')).toBe(true);
  });

  it('does NOT swallow a unique violation from a plain backfill', () => {
    // The regression: this used to return true, marking the migration applied
    // while the data change had silently failed.
    expect(isTolerable(uniqueErr, "UPDATE members SET username = 'x'")).toBe(false);
    expect(isTolerable(uniqueErr, 'INSERT INTO members (username) VALUES (\'x\')')).toBe(false);
  });

  it('still tolerates already-existing objects on a re-run', () => {
    expect(isTolerable(new Error('relation "members" already exists'), 'CREATE TABLE members ()')).toBe(true);
    expect(isTolerable(new Error('column "x" of relation "y" already exists'), 'ALTER TABLE y ADD COLUMN x int')).toBe(true);
  });

  it('still tolerates the Supabase-only objects that do not exist on Neon', () => {
    expect(isTolerable(new Error('schema "storage" does not exist'), 'CREATE POLICY p ON storage.objects')).toBe(true);
    expect(isTolerable(new Error('role "authenticated" does not exist'), 'GRANT x TO authenticated')).toBe(true);
  });

  it('never tolerates a genuine error', () => {
    expect(isTolerable(new Error('relation "typo_table" does not exist'), 'SELECT * FROM typo_table')).toBe(false);
    expect(isTolerable(new Error('syntax error at or near "SELCT"'), 'SELCT 1')).toBe(false);
  });
});

describe('migration set', () => {
  it('every migration file parses into at least one statement', () => {
    for (const f of files) {
      const stmts = splitStatements(readFileSync(join(DIR, f), 'utf8'));
      expect(stmts.length, `${f} produced no statements`).toBeGreaterThan(0);
    }
  });

  it('has no unbalanced dollar quotes (which would swallow the rest of a file)', () => {
    for (const f of files) {
      const body = readFileSync(join(DIR, f), 'utf8');
      const dollars = body.match(/\$[A-Za-z_]*\$/g) ?? [];
      expect(dollars.length % 2, `${f} has an odd number of dollar-quote markers`).toBe(0);
    }
  });

  it('0017 declares the integrity constraints the app now depends on', () => {
    const sql = readFileSync(join(DIR, '0017_integrity_hardening.sql'), 'utf8');
    // Idempotency key — without the unique index, submitDonation's ON CONFLICT
    // has nothing to conflict against and duplicates return.
    expect(sql).toMatch(/payments_idempotency_key_uidx/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX[\s\S]*payments\(idempotency_key\)/);
    // One loan per case — the weekly healer's idempotency claim rests on it.
    expect(sql).toMatch(/loans_case_id_uidx/);
    // The TRUNCATE hole in the append-only audit log.
    expect(sql).toMatch(/BEFORE TRUNCATE ON audit_log/);
    expect(sql).toMatch(/FOR EACH STATEMENT/);
    // Member deletion must not be blocked by an audit row pointing at them.
    expect(sql).toMatch(/audit_log_target_id_fkey[\s\S]*ON DELETE SET NULL/);
  });

  it('the config singleton insert is idempotent for a ledger-less re-run', () => {
    const sql = readFileSync(join(DIR, '0001_initial_schema.sql'), 'utf8');
    expect(sql).toMatch(/INSERT INTO config \(id\) VALUES \(1\) ON CONFLICT DO NOTHING/);
  });
});
