-- ════════════════════════════════════════════════════════════════════
-- Barakah Hub — integrity hardening
--
-- Three defects this closes, all of which were relying on application
-- code to enforce something only the database can actually guarantee:
--
--   1. Duplicate payments. The submit path had no idempotency key and no
--      natural uniqueness, so a request that committed server-side but
--      timed out client-side produced a second payment row when the user
--      retried — and once both were verified the fund total was credited
--      twice for money received once.
--
--   2. Duplicate qarz loans. The weekly reconciliation healer in
--      /api/cron/weekly-backup claims its insert is "keyed on caseId, so
--      idempotent". Nothing enforced that. Two overlapping cron runs could
--      both observe the same orphaned case and both insert a loan.
--
--   3. Audit-log TRUNCATE. Migration 0002 added row-level BEFORE UPDATE /
--      BEFORE DELETE triggers. Row-level triggers DO NOT FIRE on TRUNCATE,
--      so `TRUNCATE audit_log` erased the entire financial audit trail
--      unopposed, despite the documented "append-only" guarantee.
-- ════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 1. Payment idempotency
--
-- Nullable so historical rows stay valid; the partial unique index only
-- constrains rows that actually carry a key. The application supplies a
-- client-generated key per submission attempt and replays the original
-- row on conflict instead of inserting a second one.
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_uidx
  ON payments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────
-- 2. One loan per case
--
-- NOTE FOR THE OPERATOR: if this statement fails with a uniqueness
-- violation, the database ALREADY CONTAINS duplicate loans for a single
-- disbursed case — a real financial-integrity incident, not a migration
-- problem. Do not bypass it. Find them with:
--
--   SELECT case_id, count(*), array_agg(id)
--   FROM loans WHERE case_id IS NOT NULL
--   GROUP BY case_id HAVING count(*) > 1;
--
-- Reconcile by hand (keep the loan carrying repayments), then re-run.
-- ──────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS loans_case_id_uidx
  ON loans(case_id)
  WHERE case_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────
-- 3. Close the TRUNCATE hole in the append-only audit log
--
-- Statement-level, because TRUNCATE has no rows to fire a row-level
-- trigger against. Reuses the audit_log_immutable() function from 0002,
-- which raises using TG_OP and therefore reports 'TRUNCATE' correctly.
--
-- This does NOT make the table tamper-proof against the connection
-- string: the app role still owns the table and an owner can DROP the
-- trigger. Closing that requires separating the runtime role from the
-- table owner — an infrastructure change, tracked in RUNBOOK.md, not
-- something a migration can assert on its own.
-- ──────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS audit_log_block_truncate ON audit_log;

CREATE TRIGGER audit_log_block_truncate BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_immutable();

-- ──────────────────────────────────────────────────────────────────
-- 4. audit_log.target_id must not block member deletion
--
-- Both audit FKs were created with no ON DELETE clause, i.e. NO ACTION.
-- Because an admin creating a member writes an audit row targeting them,
-- essentially every member was undeletable — and hardDeleteMember only
-- discovered that AFTER it had already re-parented the member's children
-- and cleared spouse links, with no transaction to roll them back.
--
-- target_id becomes SET NULL: the audit row survives (it must — the table
-- is append-only), it simply stops pointing at a row that no longer
-- exists. The deleted member's id, username and name are written into the
-- 'member-deleted' entry's detail text by hardDeleteMember, so the trail
-- stays readable.
--
-- actor_id is deliberately left as NO ACTION. A member who performed
-- actions must keep their attribution, and hardDeleteMember now refuses
-- outright when any audit row names them as the actor.
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_target_id_fkey;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_target_id_fkey
  FOREIGN KEY (target_id) REFERENCES members(id) ON DELETE SET NULL;
