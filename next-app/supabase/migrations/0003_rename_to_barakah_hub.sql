-- ════════════════════════════════════════════════════════════════════
-- Project rename: Bait ul Maal BalochSath → Barakah Hub
--
-- Updates the singleton `config` row + column DEFAULTs so:
--   • existing deployments display the new brand
--   • new deployments creating fresh config rows pick up the new defaults
--
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- Re-base column defaults so a freshly inserted row gets the new brand.
ALTER TABLE config ALTER COLUMN org_name_en SET DEFAULT 'Barakah Hub';
ALTER TABLE config ALTER COLUMN org_name_ur SET DEFAULT 'بَرَكَة ہب';

-- Update the existing singleton row only if it still holds the legacy
-- defaults; admins who already customised the org name keep their choice.
UPDATE config
SET
  org_name_en = 'Barakah Hub',
  org_name_ur = 'بَرَكَة ہب',
  updated_at  = now()
WHERE id = 1
  AND org_name_en = 'Bait ul Maal BalochSath'
  AND org_name_ur = 'بیت المال بلوچ ساتھ';
