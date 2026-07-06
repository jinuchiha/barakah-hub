-- Add index on audit_log.detail for faster text search
-- and on audit_log.action for action-type filtering.
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log(action);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at DESC);
