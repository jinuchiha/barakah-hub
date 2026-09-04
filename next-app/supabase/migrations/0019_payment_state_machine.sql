-- ════════════════════════════════════════════════════════════════════
-- Barakah Hub — explicit payment state machine
--
-- THE PROBLEM
--
-- A payment's state was spread across five nullable columns:
--
--   pending_verify, supervisor_approved_at, supervisor_rejected_at,
--   verified_at, verified_by_id
--
-- That is 2^5 representable combinations, of which four are meaningful and
-- the rest are nonsense the database was perfectly happy to store — a
-- payment both approved and rejected, one verified while still pending, one
-- rejected with a verifier. Nothing prevented any of them.
--
-- Worse, every read site decoded the state by hand. `!p.pendingVerify` meant
-- "verified" in one file, `p.pendingVerify && !p.supervisorRejectedAt` meant
-- "awaiting review" in another. The state machine existed only in the heads
-- of whoever wrote those expressions.
--
-- THE MODEL
--
--   submitted ─────▶ supervisor_approved ─────▶ verified ──▶ voided
--       │                    │  ▲                              ▲
--       │                    │  └──────── (resend) ────────┐   │
--       ├──▶ supervisor_rejected ──▶ (resend) ──▶ submitted┘   │
--       └───────────────────────────────────────────────────────┘
--
-- `verified` is terminal except for `voided`: money recognised as received
-- can be reversed, never un-recognised. Enforced by a trigger, so an illegal
-- transition is refused by the database rather than merely avoided by code.
--
-- pending_verify becomes a GENERATED column derived from status. That keeps
-- all ~25 existing read sites working untouched while making it impossible
-- for the boolean and the status to disagree — there is now one source of
-- truth, and it cannot be written directly.
-- ════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'submitted', 'supervisor_approved', 'supervisor_rejected', 'verified', 'voided'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 1. Add the column and derive it from the existing representation ──
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status payment_status;

UPDATE payments SET status = CASE
  -- Order matters: a rejected payment may also carry an old approval
  -- timestamp, and a verified one may carry both.
  WHEN pending_verify = false                  THEN 'verified'
  WHEN supervisor_rejected_at IS NOT NULL      THEN 'supervisor_rejected'
  WHEN supervisor_approved_at IS NOT NULL      THEN 'supervisor_approved'
  ELSE                                              'submitted'
END::payment_status
WHERE status IS NULL;

ALTER TABLE payments ALTER COLUMN status SET NOT NULL;
ALTER TABLE payments ALTER COLUMN status SET DEFAULT 'submitted';

CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);

-- ── 2. pending_verify becomes derived ────────────────────────────────
--
-- Dropping and re-adding is safe because the value is fully derivable from
-- status, which was just backfilled from it. The index on the old column
-- goes with it and is recreated below.
--
-- After this, `pending_verify` cannot be written. Application writes must
-- target `status`, which is the point: the compiler will flag every site.
ALTER TABLE payments DROP COLUMN IF EXISTS pending_verify;

ALTER TABLE payments ADD COLUMN pending_verify boolean
  GENERATED ALWAYS AS (
    status = 'submitted' OR status = 'supervisor_approved' OR status = 'supervisor_rejected'
  ) STORED;

CREATE INDEX IF NOT EXISTS payments_pending_idx ON payments(pending_verify);

-- ── 3. The flags may not contradict the status ───────────────────────
--
-- Deliberately permissive about NULLs so legacy rows survive: this pins the
-- contradictions, not the completeness. A row cannot claim to be freshly
-- submitted while carrying an approval, cannot be approved and rejected at
-- once, and cannot carry a verification unless it is verified or was.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_shape;
ALTER TABLE payments ADD CONSTRAINT payments_status_shape CHECK (
  NOT (status = 'submitted'
       AND (supervisor_approved_at IS NOT NULL OR supervisor_rejected_at IS NOT NULL))
  AND NOT (status = 'supervisor_approved' AND supervisor_rejected_at IS NOT NULL)
  AND NOT (status = 'supervisor_rejected' AND supervisor_approved_at IS NOT NULL)
  AND NOT (status NOT IN ('verified', 'voided') AND verified_at IS NOT NULL)
);

-- ── 4. Only legal transitions ────────────────────────────────────────
CREATE OR REPLACE FUNCTION payments_status_transition() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
       (OLD.status = 'submitted'
          AND NEW.status IN ('supervisor_approved', 'supervisor_rejected', 'voided'))
    OR (OLD.status = 'supervisor_approved'
          -- verified is the happy path; a supervisor may still change their
          -- mind, and an admin may resend for re-approval.
          AND NEW.status IN ('verified', 'supervisor_rejected', 'submitted', 'voided'))
    OR (OLD.status = 'supervisor_rejected'
          -- resend puts it back in the queue; otherwise it can only be voided.
          AND NEW.status IN ('submitted', 'voided'))
    OR (OLD.status = 'verified'
          -- Terminal. Money recognised as received can be REVERSED (voided,
          -- with a compensating ledger entry) but never un-recognised.
          AND NEW.status = 'voided')
  ) THEN
    RAISE EXCEPTION 'Illegal payment status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_status_guard ON payments;
CREATE TRIGGER payments_status_guard BEFORE UPDATE OF status ON payments
  FOR EACH ROW EXECUTE FUNCTION payments_status_transition();
