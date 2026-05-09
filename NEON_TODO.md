# Neon migration + Better-Auth — operational checklist

> This branch (`feat/neon-migration`) now bundles **Phases 3 + 4 + 5** of
> [`MIGRATING_TO_NEON.md`](next-app/docs/MIGRATING_TO_NEON.md). The
> "phases as separate streams" rule got overridden when the Supabase
> project was deleted — auth + DB now have to land together because
> there's nothing to fall back to.
>
> **Do not merge until every step below is done.** Merging early will
> deploy a broken app: the DB is empty, no users exist, login fails.

---

## What's in this branch (already done — by code)

**Phase 3 — DB driver swap**
- ✅ `lib/db/index.ts` → `drizzle-orm/neon-http` + `@neondatabase/serverless`
- ✅ `drizzle.config.ts` reads `DATABASE_URL_DIRECT` for migrations
- ✅ `scripts/migrate-localstorage.ts` uses `drizzle-orm/neon-serverless` (transactions)

**Phase 4 — Branch-per-PR CI**
- ✅ `.github/workflows/neon-pr-branch.yml` — fresh Neon branch per PR
- ✅ `.github/workflows/neon-cleanup.yml` — deletes branch on PR close

**Phase 5 — Better-Auth (replaces deleted Supabase Auth)**
- ✅ `users` / `sessions` / `accounts` / `verifications` tables in schema
- ✅ Migration `0004_better_auth_tables.sql`
- ✅ `lib/auth.ts` (server) + `lib/auth-client.ts` (client) + `lib/auth-server.ts` helpers
- ✅ `app/api/auth/[...all]/route.ts` catch-all handler
- ✅ `middleware.ts` rewritten — `getSessionCookie` for fast edge auth gate
- ✅ Login / register / forgot-password / reset-password UI rewritten
- ✅ Topbar logout uses `authClient.signOut()`
- ✅ `meOrThrow` + `onboardSelf` + every `(app)/*` page swapped to `getMeOrRedirect()`
- ✅ Removed `@supabase/ssr` + `@supabase/supabase-js` + `lib/supabase/`
- ✅ Photo upload stubbed pending Phase 6 (R2)
- ✅ Tests updated (47 passing — one Supabase-shape test dropped)

**OpenNext deploy** (from earlier work, still on this branch)
- ✅ `wrangler.toml` for Workers, `.github/workflows/deploy.yml`

---

## What you do (Phases 1 + 2 + secrets)

### 1 · Apply schema to Neon

In your terminal, with `DATABASE_URL_DIRECT` set in `next-app/.env.local`:

```bash
cd next-app
pnpm install
pnpm db:migrate
```

This applies migrations `0001` → `0004` in order. After it succeeds, you should see all 14 tables:

```bash
psql "$DATABASE_URL_DIRECT" -c '\dt'
# expected: members, payments, cases, votes, loans, repayments,
#           notifications, messages, audit_log, config,
#           users, sessions, accounts, verifications
```

### 2 · Generate a Better-Auth secret

```bash
openssl rand -base64 32
# OR
npx auth secret
```

This produces a 32-character random string. Save it — you'll set it as `BETTER_AUTH_SECRET` next.

### 3 · Set Worker secrets *(production runtime — server actions read these)*

```bash
cd next-app
pnpm exec wrangler secret put DATABASE_URL          # paste pooled Neon URL
pnpm exec wrangler secret put DATABASE_URL_DIRECT   # paste direct Neon URL
pnpm exec wrangler secret put BETTER_AUTH_SECRET    # paste output of step 2
pnpm exec wrangler secret put RESEND_API_KEY        # optional, for password-reset emails
```

Update [`next-app/wrangler.toml`](next-app/wrangler.toml) if needed:
```toml
[vars]
NEXT_PUBLIC_APP_URL = "https://barakah-hub.bakerabi91.workers.dev"
```

**Remove old Supabase secrets** (no longer used):
```bash
pnpm exec wrangler secret delete NEXT_PUBLIC_SUPABASE_URL
pnpm exec wrangler secret delete NEXT_PUBLIC_SUPABASE_ANON_KEY
pnpm exec wrangler secret delete SUPABASE_SERVICE_ROLE_KEY
```

### 4 · Set GitHub Actions secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Source |
|---|---|
| `NEON_PROJECT_ID` | `winter-dew-24737818` (or `neonctl projects list`) |
| `NEON_API_KEY` | Neon dashboard → Account → API Keys |
| `DATABASE_URL` | pooled Neon URL |
| `DATABASE_URL_DIRECT` | direct Neon URL |
| `BETTER_AUTH_SECRET` | same value as Worker secret |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → "Edit Cloudflare Workers" |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard right sidebar |

### 5 · Set up Resend (optional — only if you want password-reset emails)

1. Sign up at <https://resend.com> (free tier: 3K emails/month)
2. Create an API key → set as `RESEND_API_KEY` Worker secret
3. (Optional) Verify a domain so emails come from `noreply@yourdomain.com` instead of Resend's default

If `RESEND_API_KEY` is unset, the password-reset code logs the link to the Worker console (`wrangler tail`) instead of emailing — a fallback for dev.

### 6 · Local smoke test

```bash
cd next-app
cp .env.example .env.local
# Fill in: DATABASE_URL, DATABASE_URL_DIRECT, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL=http://localhost:3000

pnpm dev
```

Visit <http://localhost:3000/register> → create the first admin account → finish onboarding → confirm dashboard loads.

After registration, you'll have a row in `users` and a row in `members` (created by the onboarding flow). Promote yourself to admin by running this in `psql`:

```sql
UPDATE members SET role = 'admin', status = 'approved' WHERE id = (
  SELECT id FROM members ORDER BY created_at LIMIT 1
);
```

### 7 · Merge

Open a PR from `feat/neon-migration` → `main`. CI will:
1. Spin up a `pr-<n>` Neon branch via `neon-pr-branch.yml`
2. Apply migrations to it
3. Run typecheck + lint + test against it

When CI is green, merge. The `deploy.yml` workflow then auto-deploys to `barakah-hub.bakerabi91.workers.dev`.

---

## What this branch does NOT do

- **Phase 6 (R2 storage)** — avatar upload is stubbed in
  `app/(app)/settings/profile-form.tsx` with a TODO. Members can paste
  public image URLs as a workaround until R2 is wired in a follow-up PR.
- **Email-based password reset in production** — works in dev (logs link
  to console). For real email, set `RESEND_API_KEY` (step 5 above).
- **Account deletion / admin re-create flow** — Better-Auth has admin
  APIs but no UI is wired yet.
- **Refactoring the four server actions with `neon-http` transaction-gap risk**
  (`castVote`, `recordRepayment`, `approveMember`, `broadcastNotification`).
  They work fine for our scale; if the failure modes in
  [`MIGRATING_TO_NEON.md`](next-app/docs/MIGRATING_TO_NEON.md) bite,
  refactor in a follow-up.

---

## Rollback if the merge causes problems

You burned the bridge — Supabase is gone. If post-merge breaks:

1. Revert the merge commit on `main` (`git revert -m 1 <merge-sha>`).
2. The Neon DB still has data from the test run, but the deployed app
   reverts to the pre-merge state — which still uses Supabase Auth that
   no longer exists, so the app will be broken either way.
3. Practically: fix forward instead of reverting. Whatever broke,
   diagnose via `wrangler tail`, push a fix commit, redeploy.

This is why the initial migration doc said *don't bundle phases*. The
constraint is gone; we're committed.

---

## Cheat sheet

```bash
# Apply migrations to current Neon branch
pnpm db:migrate

# See what's in the DB
pnpm db:studio                       # GUI at https://local.drizzle.studio

# Tail production logs
pnpm exec wrangler tail

# Force a redeploy without code change
git commit --allow-empty -m "chore: redeploy" && git push

# Set a Worker secret (interactive paste — never leaks to shell history)
pnpm exec wrangler secret put DATABASE_URL
```
