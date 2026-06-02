-- ════════════════════════════════════════════════════════════════════
-- Barakah Hub Phase 5 — Better-Auth tables
-- Replaces Supabase Auth (deleted with the Supabase project).
--
-- Apply order: 0001 → 0002 → 0003 → 0004
-- All four are now applied to the Neon production branch.
-- ════════════════════════════════════════════════════════════════════

-- ── users ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  name            TEXT,
  image           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── sessions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx       ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx    ON sessions(expires_at);

-- ── accounts (auth providers — for password + future OAuth) ───────
CREATE TABLE IF NOT EXISTS accounts (
  id                          TEXT PRIMARY KEY,
  user_id                     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id                  TEXT NOT NULL,
  provider_id                 TEXT NOT NULL,
  access_token                TEXT,
  refresh_token               TEXT,
  id_token                    TEXT,
  access_token_expires_at     TIMESTAMPTZ,
  refresh_token_expires_at    TIMESTAMPTZ,
  scope                       TEXT,
  password                    TEXT, -- bcrypt hash for credential provider
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounts_user_idx ON accounts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_uq ON accounts(provider_id, account_id);

-- ── verifications (email verification + reset-password tokens) ─────
CREATE TABLE IF NOT EXISTS verifications (
  id            TEXT PRIMARY KEY,
  identifier    TEXT NOT NULL,
  value         TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verifications_identifier_idx ON verifications(identifier);
CREATE INDEX IF NOT EXISTS verifications_expires_idx    ON verifications(expires_at);

-- ── members.auth_id type swap (UUID → TEXT) ───────────────────────
-- Supabase Auth used UUIDs; Better-Auth uses nanoid (text). Drop the
-- old column type and recreate with the new one. Existing rows have
-- auth_id = NULL anyway since we just stood up Neon, so this is safe.
ALTER TABLE members DROP COLUMN IF EXISTS auth_id;
ALTER TABLE members ADD COLUMN auth_id TEXT UNIQUE
  REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS members_auth_idx ON members(auth_id);
