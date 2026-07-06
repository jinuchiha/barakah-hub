-- Username login (Better-Auth username plugin) + email-OTP verification.
-- The plugin stores a normalized `username` and the display casing in
-- `display_username`. Existing auth users get their member username
-- backfilled, and are grandfathered as email-verified so the new
-- requireEmailVerification gate cannot lock anyone out.

ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (LOWER(username));

UPDATE users u
SET username = LOWER(m.username), display_username = m.username
FROM members m
WHERE m.auth_id = u.id AND u.username IS NULL;

UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE;
