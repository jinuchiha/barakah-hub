-- Push notification tokens for the Expo mobile app.
-- Each row is one device's Expo push token bound to a member.
-- ON DELETE CASCADE so tokens are removed when a member is hard-deleted.

CREATE TABLE IF NOT EXISTS push_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token       text        NOT NULL UNIQUE,
  platform    text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_tokens_member_idx ON push_tokens (member_id);
