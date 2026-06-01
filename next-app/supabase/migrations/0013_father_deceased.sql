-- Whether a member's father has passed away. Drives the "Marhoom /
-- Rahimahullah" label on the synthetic father node in the family tree.
-- Defaults to false (alive) — we never assume a non-registered father is
-- deceased; the member states it explicitly.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS father_deceased boolean NOT NULL DEFAULT false;
