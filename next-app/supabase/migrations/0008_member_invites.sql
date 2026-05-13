-- Admin-generated invite tokens for new member registration.
-- Token validated at /join/<token>; consumed during onboardSelf.

CREATE TABLE IF NOT EXISTS member_invites (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token         text        NOT NULL UNIQUE,
  created_by_id uuid        NOT NULL REFERENCES members(id),
  label         text,
  max_uses      integer     NOT NULL DEFAULT 1,
  used_count    integer     NOT NULL DEFAULT 0,
  expires_at    timestamptz,
  revoked       boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_invites_token_idx ON member_invites (token);
