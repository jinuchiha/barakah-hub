-- ════════════════════════════════════════════════════════════════════
-- Barakah Hub — notification outbox
--
-- THE PROBLEM
--
-- Three separate audit findings had one root cause: the INTENT to notify was
-- never persisted anywhere.
--
--   · Push reported success on total failure (res.ok unchecked) — fixed at
--     the call site, but nothing recorded that a notification was owed.
--   · WhatsApp free-text is rejected outside Meta's 24-hour window, so most
--     business-initiated messages were refused, logged as a warning nobody
--     read, and discarded.
--   · Twenty `void promise` fan-outs could be killed by the serverless
--     freeze. `after()` narrowed that window; it did not close it, and it
--     still gives no retry.
--
-- In every case the failure was invisible: a member who never received a
-- receipt had no way to report it, and nobody had a way to find out. There
-- was no queue, no retry, no dead letter, and no delivery rate to look at.
--
-- THE MODEL
--
-- An action writes a ROW saying what should be delivered — inside the same
-- transaction as the state change, so "the payment was verified" and "a
-- receipt is owed" commit together or not at all. A worker drains the table
-- with exponential backoff and gives up into a `dead` state that a human can
-- query.
--
-- Delivery stops being a side effect and becomes state: countable,
-- retryable, and visible.
-- ════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE outbox_channel AS ENUM ('email', 'whatsapp', 'push');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE outbox_state AS ENUM ('pending', 'sent', 'dead');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS outbox_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel         outbox_channel NOT NULL,
  state           outbox_state NOT NULL DEFAULT 'pending',

  -- Who it is for. member_id is for reporting ("which members are not
  -- getting their receipts"); `recipient` is the actual address/number/token
  -- resolved at send time, so a member changing their phone does not
  -- invalidate a queued message.
  member_id       uuid REFERENCES members(id) ON DELETE CASCADE,

  -- What to send. `kind` selects the template/renderer, `payload` carries its
  -- parameters. Deliberately jsonb rather than a rendered string: a template
  -- fix should apply to messages still queued.
  kind            text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Delivery bookkeeping.
  attempts        integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts    integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error      text,
  sent_at         timestamptz,

  -- Optional dedupe key. A UNIQUE index on it means the same logical
  -- notification cannot be queued twice — a retried action, a replayed
  -- request or a double-fired cron all collapse to one message.
  dedupe_key      text,

  created_at      timestamptz NOT NULL DEFAULT now(),

  -- A sent message must say when; a pending one must not claim to have been.
  CONSTRAINT outbox_sent_shape CHECK (
    (state = 'sent' AND sent_at IS NOT NULL)
    OR (state <> 'sent' AND sent_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS outbox_dedupe_uidx
  ON outbox_messages (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- The worker's query: oldest due pending messages first. Partial, so the
-- index stays small as `sent` rows accumulate.
CREATE INDEX IF NOT EXISTS outbox_due_idx
  ON outbox_messages (next_attempt_at)
  WHERE state = 'pending';

CREATE INDEX IF NOT EXISTS outbox_state_idx ON outbox_messages (state);
CREATE INDEX IF NOT EXISTS outbox_member_idx ON outbox_messages (member_id);

-- ──────────────────────────────────────────────────────────────────
-- Retention
--
-- Successful sends are operational data, not financial records, so unlike
-- audit_log and ledger_entries they are safe to prune. The worker deletes
-- `sent` rows older than 30 days; `dead` rows are kept for investigation
-- until someone clears them deliberately.
-- ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE outbox_messages IS
  'Notification delivery queue. Written inside the transaction that owes the '
  'notification, drained by /api/cron/outbox with exponential backoff. '
  'state=dead means max_attempts exhausted — investigate, do not ignore.';
