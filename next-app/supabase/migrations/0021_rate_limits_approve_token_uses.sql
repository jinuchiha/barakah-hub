-- 0021: global rate-limit counters + one-time approve tokens
--
-- rate_limits: Better-Auth rateLimit.storage='database' (lib/auth.ts).
--   In-memory counting is per-lambda on Vercel, so every cap was silently
--   multiplied by the number of warm instances. One shared row per
--   (client-ip, endpoint) makes the cap global. Rows are tiny and reused
--   per window; no retention concern.
--
-- approve_token_uses: consumed jti values for one-tap approve links
--   (lib/approve-token.ts). Inserting the jti at action time makes each
--   token single-action — a leaked link can re-view status but never act
--   twice. Append-only by usage; pruning old rows is safe once past the
--   token TTL.

CREATE TABLE IF NOT EXISTS "rate_limits" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  "last_request" bigint DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS "rate_limits_key_idx" ON "rate_limits" ("key");

CREATE TABLE IF NOT EXISTS "approve_token_uses" (
  "jti" text PRIMARY KEY NOT NULL,
  "payment_id" uuid NOT NULL,
  "used_by_id" uuid NOT NULL,
  "decision" text NOT NULL,
  "used_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- cron_heartbeats: liveness ledger for scheduled jobs. The outbox cron is
-- the ONLY delivery path for notifications; a wrong CRON_SECRET makes every
-- run 401 silently and members simply stop receiving receipts. Each
-- successful run upserts its row; /api/health?deep=1 flags a heartbeat
-- older than 15 minutes as degraded, which an uptime monitor turns into an
-- alert. An empty queue cannot mask a dead cron — the heartbeat is written
-- whether or not there was work.
CREATE TABLE IF NOT EXISTS "cron_heartbeats" (
  "job" text PRIMARY KEY NOT NULL,
  "last_run_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_status" text DEFAULT 'ok' NOT NULL,
  "detail" text
);
