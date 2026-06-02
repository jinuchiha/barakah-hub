-- Adds a "supervisor" role between member and admin.
--
-- Supervisors are trusted with fund collection — they receive cash from
-- family members and deposit it into the central fund, then record /
-- verify payments in the app. They are NOT given full admin powers
-- (member CRUD, config, force-approve cases, etc.), so a separate role
-- prevents accidental over-permissioning.
--
-- Postgres requires ALTER TYPE ... ADD VALUE to be COMMITTED before the
-- new value can be used in a query, so we don't UPDATE any rows in the
-- same migration. The role assignment happens in a follow-up script.

ALTER TYPE role ADD VALUE IF NOT EXISTS 'supervisor';
