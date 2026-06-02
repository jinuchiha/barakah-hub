# Local development guide

> **One canonical guide for running Barakah Hub on `localhost` and getting
> it Cloudflare-ready.** Production-side detail lives in
> [`DEPLOY.md`](DEPLOY.md). Branch / merge workflow is in
> [`CONTRIBUTING.md`](CONTRIBUTING.md). Don't read all three — start here.

---

## Phase 1 — Localhost setup

### 1.1 Prerequisites

| Tool | Version | How to install |
|---|---|---|
| Node.js | **22.x LTS** (matches CI + Workers runtime) | <https://nodejs.org> or `nvm install 22` |
| pnpm | **9.x** | `npm i -g pnpm` |
| Postgres client (`psql`) | any 16.x+ | macOS: `brew install postgresql`; Win: <https://www.postgresql.org/download/windows> |
| `neonctl` (optional) | latest | `npm i -g neonctl` |
| `wrangler` (only when ready to deploy) | 4.x | comes from `pnpm install` — no global needed |

### 1.2 Clone + install

```bash
git clone https://github.com/jinuchiha/barakah-hub.git
cd barakah-hub/next-app
pnpm install
```

The `.npmrc` in this repo hoists `typescript` so `pnpm typecheck` works
without surprises.

### 1.3 Database — Neon

We use **Neon** (serverless Postgres). The branch you check out should
already match what's deployed; you just need credentials.

1. Get the two connection strings from your Neon project (or run
   `neonctl connection-string production --pooled` and the same without
   `--pooled`).
2. Copy the env template:

```bash
cp .env.example .env.local
```

3. Fill in `.env.local`:

```env
# Pooled — used by app runtime (HTTP driver via Neon pooler)
DATABASE_URL=postgresql://<user>:<pw>@<host>-pooler.<region>.aws.neon.tech/<db>?sslmode=require

# Direct — used by drizzle-kit / scripts/migrate.ts (PgBouncer rejects DDL)
DATABASE_URL_DIRECT=postgresql://<user>:<pw>@<host>.<region>.aws.neon.tech/<db>?sslmode=require

# Auth — generate one fresh, never copy from chat / Slack / docs
BETTER_AUTH_SECRET=<output of `openssl rand -base64 32`>

# Origin used for CSRF / cookie domain
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional — leave blank if not configured
RESEND_API_KEY=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
```

The file is gitignored via `.env.*`. Never commit it. Never paste
secrets into chat / GitHub issues / Slack — see the rotation note in
[`NEON_TODO.md`](../NEON_TODO.md).

### 1.4 Apply migrations

```bash
pnpm db:migrate
```

This runs [`scripts/migrate.ts`](scripts/migrate.ts) against
`DATABASE_URL_DIRECT`. Idempotent — safe to re-run. Should land all 5
SQL files in `supabase/migrations/` and print the result. Verify:

```bash
pnpm exec tsx scripts/db-check.ts
# expect 15 tables: members, payments, cases, votes, loans, repayments,
# notifications, messages, audit_log, config,
# users, sessions, accounts, verifications, _barakah_migrations
```

### 1.5 Start the dev server

```bash
pnpm dev
```

Opens at <http://localhost:3000>. If port 3000 is taken, Next bumps to
3001 (and so on); the URL is printed in the terminal.

> **If port 3000 is in use** and you want to free it:
> - macOS / Linux: `lsof -i :3000` then `kill <pid>`
> - Windows: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F`

### 1.6 First-user bootstrap

1. Open <http://localhost:3000/register>
2. Create your account (≥8-char password). Auto-signs you in and redirects to `/onboarding`.
3. Complete the wizard (English name, father's name, phone, city, province).
4. You'll land on `/dashboard` as a `member` with `status='approved'` is **not** granted by default.

Promote yourself to admin (one-off):

```bash
psql "$DATABASE_URL_DIRECT" -c "
  UPDATE members SET role='admin', status='approved'
  WHERE id = (SELECT id FROM members ORDER BY created_at LIMIT 1);
"
```

Refresh the dashboard — admin sidebar links (Members / Fund Register /
Loans / Broadcast / Audit Log) now appear.

---

## Phase 2 — Code quality + readiness audit

### 2.1 The four gates (run before every commit)

```bash
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint . — must be 0 errors
pnpm test           # vitest run — currently 47 tests
pnpm build          # next build (production w/ placeholder env)
```

CI runs the same four (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).
If they pass locally, the PR will pass CI.

### 2.2 Manual smoke test paths

After registering an admin, walk these paths once — they exercise the
auth-gated server actions, sadqa privacy, and the audit log:

| Surface | Action | Expected |
|---|---|---|
| `/admin/members` | Add a member, edit their profile, approve them | new row in `members`, audit entry |
| `/admin/fund` | Record a payment, then verify it from the pending list | payment count of total fund updates |
| `/cases` | Create an emergency case (as admin), then vote | case status reflects threshold |
| `/admin/loans` | Issue a loan, then record a repayment up to the limit, then try to over-repay | second over-amount call rejected (P1-RA-4 fix) |
| `/myaccount` | Submit a self-donation | appears in pending until verified |
| `/admin/broadcast` | Send a notification to all approved members | each receives a row |
| `/admin/audit` | Inspect the journal | all above actions logged |
| `/messages` | Send a message to admin from a member account | delivered + notification appears |
| `/notifications` | Read + mark all read | `read=true` updates |

### 2.3 Edge / load testing (optional — overkill for family scale)

If you want to stress-test before deploy:

```bash
# Lightweight HTTP burst (built into Node, no install)
npx autocannon -c 10 -d 20 http://localhost:3000/login

# Better signal — install k6
# https://k6.io/docs/get-started/installation/
k6 run scripts/load-test.k6.js   # (write your own scenario; not currently in repo)
```

For our family-fund scale (sub-100 daily-active users), this is
informational — not a blocker for deploy.

### 2.4 Common localhost issues + fixes

| Symptom | Cause | Fix |
|---|---|---|
| `BETTER_AUTH_SECRET is not set or is too short` at boot | `.env.local` missing the var, or value < 32 chars | Set it; regenerate with `openssl rand -base64 32` |
| `DATABASE_URL must be set` at boot | Same | Paste pooled Neon URL into `.env.local` |
| `Database connection string format...` | URL malformed (missing host or query string) | Should be `postgresql://user:pw@host/db?sslmode=require` |
| 307 redirect from `/register` or `/login` | Middleware bug — fixed in commit `e72ff08` | Pull latest |
| Login button does nothing | Browser blocking 3rd-party cookies on `localhost` | Switch browser, or set `NEXT_PUBLIC_APP_URL=http://localhost:3000` exactly |
| CORS errors hitting `/api/auth/*` | `trustedOrigins` mismatch in `lib/auth.ts` | The `baseURL` env var must match what your browser sees in the address bar (port included) |
| `relation "users" does not exist` | Migrations not applied | `pnpm db:migrate` |
| Build errors about `.next/dev/types/...` | Stale typed-routes cache | `rm -rf .next` and re-run |
| Dev server hot reload broken | OS file watcher limit (Linux) | `echo fs.inotify.max_user_watches=524288 \| sudo tee -a /etc/sysctl.conf && sudo sysctl -p` |

### 2.5 Useful day-to-day commands

```bash
pnpm db:studio       # Drizzle Studio at https://local.drizzle.studio
pnpm test:watch      # Vitest in watch mode
pnpm db:generate     # After schema.ts edits — generates a new migration file
```

---

## Phase 3 — Cloudflare pre-flight

The repo is **already structured for Cloudflare Workers via OpenNext**.
You don't need to refactor anything; just verify the inputs.

### 3.1 What "Cloudflare-ready" means here (already done)

- ✅ [`wrangler.toml`](wrangler.toml) declares the Worker `barakah-hub` + nodejs_compat flag
- ✅ [`open-next.config.ts`](open-next.config.ts) — OpenNext adapter config
- ✅ [`middleware.ts`](middleware.ts) on Edge runtime (Workers requirement)
- ✅ [`lib/db/index.ts`](lib/db/index.ts) uses `drizzle-orm/neon-http` (fetch-based, fits V8 isolates)
- ✅ Build script `pnpm build:cf` runs `opennextjs-cloudflare build`
- ✅ [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) auto-deploys on push to `main`
- ✅ All env vars consumed via `process.env.*` — no hardcoded URLs in code

### 3.2 Local-vs-prod env decoupling (already done)

| Concern | Local source | Prod source |
|---|---|---|
| `DATABASE_URL` / `DATABASE_URL_DIRECT` | `.env.local` (gitignored) | `wrangler secret put` on the Worker |
| `BETTER_AUTH_SECRET` | `.env.local` | `wrangler secret put` |
| `NEXT_PUBLIC_APP_URL` | `.env.local` (`http://localhost:3000`) | `wrangler.toml [vars]` (`https://barakah-hub.bakerabi91.workers.dev`) |
| Resend, Sentry, etc. | `.env.local` | `wrangler secret put` |

The same code reads the same env-var names from both — no per-env code
branches. The build step in `deploy.yml` injects build-time vars from
GitHub Actions secrets; runtime secrets are bound to the Worker
directly (never visible to GitHub).

### 3.3 Pre-flight checklist (run before merging to `main`)

- [ ] All four gates green locally (`typecheck`, `lint`, `test`, `build`)
- [ ] Smoke-tested `/login`, `/register`, `/forgot-password` on `localhost`
- [ ] Walked the manual paths in §2.2 with the live Neon DB
- [ ] `.env.local` has `DATABASE_URL`, `DATABASE_URL_DIRECT`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`
- [ ] Worker secrets set: `wrangler secret list` shows `DATABASE_URL`, `DATABASE_URL_DIRECT`, `BETTER_AUTH_SECRET`
- [ ] GitHub Actions secrets set: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `BETTER_AUTH_SECRET`
- [ ] GitHub Environment named `production` exists (deploy workflow targets it)
- [ ] Migrations applied to production Neon branch (`pnpm db:migrate` against the production URL)
- [ ] Neon DB password rotated since the one shared in chat (per security hygiene)
- [ ] No `console.log` of secrets / personally-identifiable data left in code
- [ ] Branch is up to date with `main` (rebase if needed)

### 3.4 Optional Cloudflare-specific local preview

Before pushing to prod, you can run the OpenNext build locally + serve
it via a Workers-emulated runtime:

```bash
pnpm build:cf       # OpenNext bundle → .open-next/
pnpm preview:cf     # wrangler dev — serves the production bundle locally
```

> **Windows symlink note:** OpenNext's bundling step uses symlinks which
> Windows blocks unless Developer Mode is enabled (Settings → For
> developers → Developer Mode = ON) **or** the terminal runs as
> Administrator. CI on Linux runners (the actual deploy path) is
> unaffected. Most users never need to run the OpenNext build locally.

### 3.5 Deploy

When the pre-flight checklist passes, follow the merge sequence in
[`DEPLOY.md`](DEPLOY.md) §3 — Path A (auto-deploy from GitHub) is
recommended. The merge to `main` triggers
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) which
runs `pnpm build:cf` on a Linux runner and deploys via
`cloudflare/wrangler-action@v3`. ~3 minutes from merge to live at
<https://barakah-hub.bakerabi91.workers.dev>.

---

## What this guide deliberately doesn't cover

- **Multi-tenancy / subscription billing** — explicitly out of scope; this is a single-tenant family-fund app, not a paid SaaS.
- **R2 storage for avatars** — Phase 6, not yet wired. Profile-photo upload is stubbed; users can paste public image URLs as a workaround.
- **Stripe / Vercel / Linear UI parity** — different product category. The visual identity is Brutalist Islamic (charcoal / navy / off-white).
- **Email-based password reset in production** — works in dev (logs link to `wrangler tail`); set `RESEND_API_KEY` for real delivery.

See [`RE_AUDIT.md`](RE_AUDIT.md) for the full backlog.
