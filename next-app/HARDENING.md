# Production Hardening — September 2026 batch

Every P0/P1 from the adversarial production-readiness review, what changed,
and what the OPERATOR still has to do. Each fix has a regression test.

## P0 fixes (code complete)

### 1. Private file storage
- Receipts (bank-transfer screenshots) now upload with `access: 'private'` +
  random suffix under `receipts/<memberId>/` — the blob URL itself is dead
  without the store token ([lib/storage.ts](lib/storage.ts)).
- Served ONLY via `GET /api/files/[...path]`: authenticated (cookie or
  Bearer), authorized per-file — owner, admin, or supervisor
  ([lib/file-access.ts](lib/file-access.ts), tested in
  test/lib/file-access.test.ts).
- `receiptUrl` submissions accept only `/api/files/receipts/…` (or dev
  `/uploads/…`) — the arbitrary-https tracking-pixel vector is closed.
- Avatars stay public (next/image fetches without credentials) but are now
  unguessable (random suffix) and the previous blob is deleted on replace.
- Mobile: receipts open in an in-app authed viewer
  (mobile/components/ReceiptImageModal.tsx), not the system browser.
- **OPERATOR — migrate existing public blobs (old URLs stay live until run):**
  `BLOB_READ_WRITE_TOKEN=… DATABASE_URL=… node scripts/migrate-receipts-private.mjs --dry-run`
  then without `--dry-run`.

### 2. Security headers
- Full set on every response via [lib/security-headers.mjs](lib/security-headers.mjs)
  + next.config.mjs: CSP (self-only scripts; blob-store images; Sentry
  ingest connects; frames denied both directions), HSTS 2y+subdomains,
  nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP.
- `'unsafe-inline'` remains in script-src (App Router inline bootstrap;
  nonce-per-request conflicts with static responses). Documented tradeoff.
- Tests: test/lib/security-headers.test.ts.

### 3. Password-reset URL logging
- `lib/auth.ts` no longer logs the reset link + email when Resend is
  unconfigured. Delivery is skipped with a non-PII warning
  (`sendResetPasswordEmail` in lib/email.ts). Recipient addresses in other
  email logs are masked (`u***@domain`).
- Test proves no URL/token/address can reach a log:
  test/lib/email-redaction.test.ts.

### 4. Migration rehearsal (procedure + tooling; EXECUTION IS OPERATOR WORK)
- `scripts/rehearse-migrations.mjs`: run against a Neon BRANCH of
  production; snapshots row counts, verified-payment totals, ledger balance,
  FK/orphan checks → applies migrations with the production runner →
  reconciles. Refuses to run against the production host.
- Migrations 0017–0021 are additive (tables/constraints); reconciliation
  must show every count/total unchanged.
- Rollback = Neon PITR / branch restore. No fake down-migrations.
- **OPERATOR:** create branch, run rehearsal, delete branch — BEFORE merging
  to main (merge = deploy = migrate, per scripts/migrate-on-deploy.ts).

### 5. Outbox alerting
- `cron_heartbeats` table (migration 0021): every cron upserts a heartbeat
  on success. A wrong CRON_SECRET (perpetual silent 401) now surfaces as a
  stale heartbeat.
- `/api/health?deep=1` → 503 with `degraded: ["outbox-cron"]` when the
  outbox heartbeat is >15 min old, and `degraded: ["notifications"]` on
  dead letters / >1h backlog. Detail (dbHost, release, counts) now requires
  `HEALTH_CHECK_KEY` (or CRON_SECRET) — anonymous callers get booleans only.
- Outbox cron raises Sentry events (counts only, no PII) on dead letters
  and stalled backlog.
- **OPERATOR:** point an uptime monitor at `/api/health?deep=1` with a
  ≤5-minute interval and alerting on non-200; set HEALTH_CHECK_KEY if the
  monitor should see diagnostic detail.

## P1 fixes (code complete)

- **OTP brute force**: `allowedAttempts: 5` on the email-OTP plugin.
- **Global rate limiting**: Better-Auth `rateLimit.storage: 'database'`
  (`rate_limits` table, migration 0021) — caps are now global, not
  per-lambda.
- **Session revocation on password reset**:
  `revokeSessionsOnPasswordReset: true` — web cookies AND mobile bearer
  tokens die with the old password.
- **Sessions on reject/deceased**: admin actions now delete the member's
  auth sessions in the same transaction.
- **Approve tokens**: TTL 7d → 48h; every token carries a `jti`; the
  approve/reject action consumes it (`approve_token_uses`, PK-guarded) —
  single-action tokens. Fixes a real replay bug: a link that had REJECTED a
  payment could previously be replayed to approve it. Used links stop
  disclosing the donor name. Legacy (pre-jti) links are invalid.
- **Mobile PIN**: v2 format — per-device random salt, iterated SHA-256
  chain, constant-time compare, timed exponential backoff (30s→15min)
  instead of a permanent 3-strike lockout. v1 hashes verify once and
  upgrade transparently. Honest scope note: a 4-digit space cannot be made
  offline-bruteforce-proof by any KDF; the protections are Keystore
  encryption at rest + persistent backoff. Tests: mobile/__tests__/pin.test.ts.
- **Mobile crash reporting**: @sentry/react-native wired
  (mobile/lib/sentry.ts, init in app/_layout.tsx, expo plugin registered).
  **OPERATOR:** set EXPO_PUBLIC_SENTRY_DSN (+ SENTRY_AUTH_TOKEN and real
  `organization` in app.json plugin config for symbolicated builds), then
  verify a forced test crash reaches the dashboard. UNVERIFIED until then.
- **Invite redemption**: mobile path now transactional (member + invite +
  audit in one unit); BOTH paths check the UPDATE rowcount — an exhausted
  invite fails the signup loudly instead of admitting past the cap.
- **Audit PII**: config changes no longer write the EasyPaisa number into
  the append-only audit log (`[updated]` marker instead).

## Env additions
| Var | Where | Purpose |
|---|---|---|
| `HEALTH_CHECK_KEY` | Vercel prod (optional) | uptime monitor's key for deep health detail |
| `EXPO_PUBLIC_SENTRY_DSN` | EAS env/secrets | mobile crash reporting |
| `SENTRY_AUTH_TOKEN` | EAS build env | mobile source-map upload (optional) |
| `PROD_DATABASE_HOST` | local, when rehearsing | safety interlock for rehearse-migrations |

## Explicitly NOT done here (needs operator/hardware)
- Applying migration 0021 to production (happens on merge → deploy).
- Running the blob-privacy migration (needs BLOB_READ_WRITE_TOKEN).
- Neon branch rehearsal execution; PITR restore drill.
- Uptime monitor configuration.
- Real-device push/biometric testing; signed APK (EAS credentials).
- REQUIRE_EMAIL_VERIFICATION=true in Vercel prod env (flip only after the
  Resend sender domain is verified — see lib/auth.ts comment).
