-- ════════════════════════════════════════════════════════════════════
-- Barakah Hub Phase 3 — Security fixes (audit P0-3, P0-2 hardening, P1-6, P1-14)
-- Apply via:  supabase db push
-- ════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- P0-3: avatar storage — restrict uploads to the user's own folder
-- ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "avatars_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_authenticated_update" ON storage.objects;

CREATE POLICY "avatars_self_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_self_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_self_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ──────────────────────────────────────────────────────────────────
-- P1-6: chronological month ordering — derive month_start from paid_on
-- (existing month_label kept for display)
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS month_start DATE;

UPDATE payments
SET month_start = date_trunc('month', paid_on)::date
WHERE month_start IS NULL;

ALTER TABLE payments ALTER COLUMN month_start SET NOT NULL;
ALTER TABLE payments ALTER COLUMN month_start SET DEFAULT date_trunc('month', CURRENT_DATE)::date;

CREATE INDEX IF NOT EXISTS payments_month_start_idx ON payments(month_start);

-- ──────────────────────────────────────────────────────────────────
-- P1-14: notifications/messages title field
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_ur TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_en TEXT;

-- ──────────────────────────────────────────────────────────────────
-- P0-2 hardening: refuse direct UPDATE/DELETE on audit_log even from
-- the postgres role used by the app (defence-in-depth).
-- The app's connection pooler still bypasses RLS, but explicit
-- triggers cover that gap.
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only — % blocked', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_block_update ON audit_log;
DROP TRIGGER IF EXISTS audit_log_block_delete ON audit_log;

CREATE TRIGGER audit_log_block_update BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
CREATE TRIGGER audit_log_block_delete BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
