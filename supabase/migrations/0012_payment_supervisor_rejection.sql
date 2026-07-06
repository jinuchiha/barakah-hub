-- Supervisor rejection state for payments.
--
-- A supervisor can now reject a payment (with optional note). The
-- payment lands in the admin's queue who can either:
--   a. Re-send it to the supervisor (clears the rejection, back to pending)
--   b. Delete it entirely
--
-- The admin can NOT verify a supervisor-rejected payment directly,
-- because the cash is physically with the supervisor — final approval
-- must go through them.
--
-- State machine:
--   pending_verify=true, supervisor_approved_at=NULL,
--   supervisor_rejected_at=NULL                            → awaiting supervisor
--
--   pending_verify=true, supervisor_approved_at=set        → awaiting admin verify
--
--   pending_verify=true, supervisor_rejected_at=set        → admin must resend or delete
--
--   pending_verify=false                                   → fully verified

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS supervisor_rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS supervisor_rejected_by_id uuid REFERENCES members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supervisor_rejection_note text;

CREATE INDEX IF NOT EXISTS payments_supervisor_rejected_idx
  ON payments(supervisor_rejected_at)
  WHERE supervisor_rejected_at IS NOT NULL;
