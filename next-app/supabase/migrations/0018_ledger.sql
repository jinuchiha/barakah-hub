-- ════════════════════════════════════════════════════════════════════
-- Barakah Hub — double-sided ledger
--
-- THE PROBLEM
--
-- The fund total was `SUM(amount) FROM payments WHERE pending_verify = false`
-- — gross INFLOW, with no debit side anywhere. Consequences:
--
--   · The balance members saw overstated the money actually available,
--     because everything ever disbursed was still counted.
--   · issueLoan and disburseCase could not check solvency, so the fund could
--     be committed far beyond its holdings with nothing objecting.
--   · "Delete the payment" was the only way to correct a mistake, which
--     destroyed the record instead of reversing it.
--   · The balance was recomputed ad hoc in several places, each free to
--     drift from the others.
--
-- THE MODEL
--
-- One append-only table. Every movement of money is one signed row:
-- positive is money into the fund, negative is money out. The balance of a
-- pool is simply SUM(amount) for that pool — one definition, one place.
--
--   payment          + a contribution, written when it is VERIFIED (that is
--                      when the money is recognised as received, not when it
--                      is submitted)
--   loan_issue       − qarz handed to a borrower
--   loan_repayment   + qarz coming back
--   case_disbursement− a gift paid out of a pool
--   reversal         ± an explicit correction, pointing at what it reverses
--
-- Nothing is ever updated or deleted here; a mistake is corrected by adding
-- a reversal, exactly like the audit log.
-- ════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE ledger_source AS ENUM (
    'payment', 'loan_issue', 'loan_repayment', 'case_disbursement', 'reversal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS ledger_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool         fund_pool NOT NULL,
  -- Signed, in whole rupees, matching every other money column in the schema.
  -- Zero is meaningless in a ledger, so it is refused.
  amount       integer NOT NULL CHECK (amount <> 0),
  source_type  ledger_source NOT NULL,
  -- The row this entry accounts for: payments.id, loans.id, repayments.id or
  -- cases.id. ON DELETE is deliberately absent — see the note below.
  source_id    uuid,
  member_id    uuid REFERENCES members(id) ON DELETE SET NULL,
  -- Set only on a reversal, naming the entry being undone.
  reverses_id  uuid REFERENCES ledger_entries(id),
  detail       text,
  occurred_on  date NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES members(id) ON DELETE SET NULL,
  -- A reversal must say what it reverses; nothing else may.
  CONSTRAINT ledger_reversal_shape CHECK (
    (source_type = 'reversal' AND reverses_id IS NOT NULL)
    OR (source_type <> 'reversal' AND reverses_id IS NULL)
  )
);

-- One entry per source row. This is what makes posting to the ledger
-- idempotent: a retried verification, a double-fired cron or a replayed
-- request cannot credit the same payment twice. Reversals are excluded
-- because a reversal legitimately shares its subject's identity.
CREATE UNIQUE INDEX IF NOT EXISTS ledger_source_uidx
  ON ledger_entries (source_type, source_id)
  WHERE source_id IS NOT NULL AND source_type <> 'reversal';

CREATE INDEX IF NOT EXISTS ledger_pool_idx ON ledger_entries (pool);
CREATE INDEX IF NOT EXISTS ledger_member_idx ON ledger_entries (member_id);
CREATE INDEX IF NOT EXISTS ledger_occurred_idx ON ledger_entries (occurred_on);

-- Append-only, enforced the same way as audit_log (migrations 0002 + 0017).
-- A balance that can be edited after the fact is not a balance.
CREATE OR REPLACE FUNCTION ledger_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only — % blocked. Post a reversal instead.', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS ledger_block_update ON ledger_entries;
DROP TRIGGER IF EXISTS ledger_block_delete ON ledger_entries;
DROP TRIGGER IF EXISTS ledger_block_truncate ON ledger_entries;

CREATE TRIGGER ledger_block_update BEFORE UPDATE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ledger_immutable();
CREATE TRIGGER ledger_block_delete BEFORE DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ledger_immutable();
CREATE TRIGGER ledger_block_truncate BEFORE TRUNCATE ON ledger_entries
  FOR EACH STATEMENT EXECUTE FUNCTION ledger_immutable();

-- ──────────────────────────────────────────────────────────────────
-- Backfill from the existing records
--
-- Derives the ledger from what already happened, so the balance is correct
-- from the first request after this migration rather than starting at zero.
--
-- Every insert is ON CONFLICT DO NOTHING against ledger_source_uidx, so this
-- is safe to re-run — the disaster-recovery path where migrations are applied
-- without the ledger table of applied migrations.
--
-- NOTE on source_id having no ON DELETE clause: a ledger entry must outlive
-- the row it accounts for, and payments cascade-delete with their member. The
-- entry is therefore NOT a foreign key to those tables at all — source_id is
-- a plain uuid. That is intentional: referential integrity would let a
-- deletion silently rewrite history.
-- ──────────────────────────────────────────────────────────────────

-- Verified contributions.
INSERT INTO ledger_entries (pool, amount, source_type, source_id, member_id, detail, occurred_on)
SELECT p.pool, p.amount, 'payment', p.id, p.member_id,
       'Backfilled from verified payment ' || p.month_label, p.paid_on
FROM payments p
WHERE p.pending_verify = false
ON CONFLICT DO NOTHING;

-- Qarz handed out. Covers loans issued directly and those auto-created from
-- a disbursed qarz case; both are money leaving the fund exactly once.
INSERT INTO ledger_entries (pool, amount, source_type, source_id, member_id, detail, occurred_on)
SELECT 'qarz', -l.amount, 'loan_issue', l.id, l.member_id,
       'Backfilled from loan: ' || l.purpose, l.issued_on
FROM loans l
ON CONFLICT DO NOTHING;

-- Qarz coming back.
INSERT INTO ledger_entries (pool, amount, source_type, source_id, member_id, detail, occurred_on)
SELECT 'qarz', r.amount, 'loan_repayment', r.id, l.member_id,
       'Backfilled from repayment', r.paid_on
FROM repayments r
JOIN loans l ON l.id = r.loan_id
ON CONFLICT DO NOTHING;

-- Gifts paid out. Qarz cases are excluded because their outflow is already
-- recorded by the loan_issue entry above — counting both would debit the
-- fund twice for one disbursement.
INSERT INTO ledger_entries (pool, amount, source_type, source_id, member_id, detail, occurred_on)
SELECT c.pool, -c.amount, 'case_disbursement', c.id, c.applicant_id,
       'Backfilled from disbursed case for ' || c.beneficiary_name,
       COALESCE(c.resolved_at::date, CURRENT_DATE)
FROM cases c
WHERE c.status = 'disbursed' AND c.case_type = 'gift'
ON CONFLICT DO NOTHING;
