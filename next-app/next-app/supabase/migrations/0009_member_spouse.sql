-- Adds spouse_id self-reference to members so the family tree can render
-- husband-wife pairs and walk lineage from BOTH partners' fathers.
--
-- Self-FK with ON DELETE SET NULL so deleting one partner doesn't cascade
-- the other. The pairing is conceptually bidirectional; we only enforce
-- the single column. Admin UI keeps both sides in sync (when A is set as
-- B's spouse, B is set as A's spouse too).

ALTER TABLE members ADD COLUMN IF NOT EXISTS spouse_id uuid
  REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS members_spouse_idx ON members(spouse_id);
