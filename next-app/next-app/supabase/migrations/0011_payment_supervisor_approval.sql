-- Two-step payment approval: supervisor pre-approves, admin gives the
-- final verification. Workflow:
--   pending_verify=true, supervisor_approved_at=NULL  → awaiting supervisor
--   pending_verify=true, supervisor_approved_at=set   → awaiting admin
--   pending_verify=false                              → fully verified

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS supervisor_approved_at timestamptz;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS supervisor_approved_by_id uuid
    REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payments_supervisor_approval_idx
  ON payments(supervisor_approved_at)
  WHERE supervisor_approved_at IS NOT NULL;
