# Neon migration — operational checklist

> This branch (`feat/neon-migration`) carries every code change Phases 3–4
> of [`MIGRATING_TO_NEON.md`](next-app/docs/MIGRATING_TO_NEON.md) require.
> The remaining phases (1, 2, 5–7) are operational — they need your Neon
> account, your Supabase data, and judgment calls about cutover timing.
>
> **Do not merge this branch into `main` until at least Phases 1 + 2 are
> complete.** Merging early will break the live deployment because
> `DATABASE_URL` will still point at Supabase, and the Neon HTTP driver
> can't talk to a Supabase Postgres endpoint.

---

## What's in this branch (already done — Phases 3–4)

- ✅ `lib/db/index.ts` rewritten for `drizzle-orm/neon-http` + `@neondatabase/serverless`
- ✅ `drizzle.config.ts` reads `DATABASE_URL_DIRECT` (direct, non-pooled connection — Drizzle Kit needs this for migrations)
- ✅ `.env.example` updated with the new var pair (pooled + direct)
- ✅ Driver swap in `package.json` (removed `postgres`, added `@neondatabase/serverless`)
- ✅ `.github/workflows/neon-pr-branch.yml` — branch-per-PR with auto migration apply + PR comment
- ✅ `.github/workflows/neon-cleanup.yml` — deletes the branch on PR close

## What you do (Phases 1 + 2 — required before merge)

### 1 · Stand up Neon

```bash
npm i -g neonctl
neonctl auth                                        # browser auth
neonctl projects create --name barakah-hub \
  --region-id aws-ap-southeast-1                    # pick the region nearest your users
neonctl branches create --name production --parent main
neonctl branches create --name dev        --parent main
```

Save the **project ID** (`neonctl projects list`) — you'll need it for GitHub secrets.

### 2 · Export from Supabase, import to Neon

```bash
# From your Supabase dashboard → Settings → Database → Connection String → Direct
export SUPABASE_DB_URL='postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require'

# 2.1 Schema-only dump (public schema, no Supabase internals)
pg_dump "$SUPABASE_DB_URL" \
  --schema-only --no-owner --no-privileges --schema=public \
  -f schema-from-supabase.sql

# 2.2 Strip Supabase-specific GRANT statements + RLS that references auth.uid()
#     (open the file and remove anything referencing supabase_admin / authenticated /
#      anon / service_role)

# 2.3 Apply schema to Neon production branch
psql "$(neonctl connection-string production)" -f schema-from-supabase.sql

# 2.4 Data dump
pg_dump "$SUPABASE_DB_URL" \
  --data-only --schema=public --column-inserts \
  -f data-from-supabase.sql

# 2.5 Import data
psql "$(neonctl connection-string production)" -f data-from-supabase.sql

# 2.6 Validate row counts (script in MIGRATING_TO_NEON.md §2.5)
```

### 3 · Set the secrets

**Cloudflare Worker** (runtime — server actions read these):

```bash
cd next-app
wrangler secret put DATABASE_URL          # paste pooled Neon URL
wrangler secret put DATABASE_URL_DIRECT   # paste direct Neon URL
# Keep SUPABASE_SERVICE_ROLE_KEY until Phase 5 (auth migration)
```

**GitHub Actions** — Settings → Secrets → Actions → New repository secret:

| Secret | Source |
|---|---|
| `NEON_PROJECT_ID` | `neonctl projects list` |
| `NEON_API_KEY` | Neon dashboard → Account Settings → API Keys |
| `DATABASE_URL` | pooled Neon URL (matches Worker secret) |
| `DATABASE_URL_DIRECT` | direct Neon URL |

### 4 · Local dev setup

```bash
cd next-app
cp .env.example .env.local
# Fill in:
#   DATABASE_URL=postgresql://...@*-pooler...neon.tech/...
#   DATABASE_URL_DIRECT=postgresql://...@<host without pooler>...neon.tech/...
#   NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (still Supabase, until Phase 5)

pnpm install
pnpm typecheck && pnpm test                # should be clean
pnpm dev                                   # smoke-test login → dashboard
```

### 5 · Merge

When the smoke test passes locally **and** the production Neon branch
contains the migrated data **and** the Worker secrets are updated, open
a PR from `feat/neon-migration` → `main`. CI will:
1. Spin up a `pr-<n>` Neon branch
2. Apply migrations to it
3. Run typecheck + lint + test against the PR branch's DB

When CI is green, merge. Cloudflare Workers redeploys via the existing
`deploy.yml` workflow.

---

## Phases 5 + 6 (later, separate streams)

**Do not bundle these with the DB migration.** Each is its own PR cycle:

- **Phase 5 — Auth.** Replace Supabase Auth with Better-Auth. See
  [`MIGRATING_TO_NEON.md` §5](next-app/docs/MIGRATING_TO_NEON.md). Plan ~3
  days. Forces all users to re-authenticate on next login.
- **Phase 6 — Storage.** Replace Supabase Storage with Cloudflare R2.
  See [`MIGRATING_TO_NEON.md` §6](next-app/docs/MIGRATING_TO_NEON.md).
  Plan ~2 days. Migrate avatar URLs in `members.photo_url`.

---

## Rollback if something goes wrong

If the merge causes problems:

1. Revert the merge commit on `main` (`git revert -m 1 <merge-sha>`).
2. Push the revert. CI redeploys the previous (Supabase-backed) version.
3. Worker secrets still have `DATABASE_URL` pointing at Neon — flip them
   back to the Supabase URL via `wrangler secret put DATABASE_URL`.

The Supabase project should stay alive for **30 days minimum** after
cutover as a hot rollback target. Per the doc:

> Phase 7.7 (delete Supabase project) — only after a 30-day grace
> window of no incidents.

---

## What this branch does NOT do

- Does not migrate Supabase Auth → Better-Auth (Phase 5)
- Does not migrate Supabase Storage → R2 (Phase 6)
- Does not delete the Supabase project (Phase 7.7)
- Does not refactor the four server actions with transaction-gap risk
  (`castVote`, `recordRepayment`, `approveMember`, `broadcastNotification`).
  Those work fine with `neon-http` for our scale; if the failure modes in
  the doc bother you, refactor in a follow-up PR.

The boilerplate and CI in this branch should be enough that all the
above can land as separate, reviewable PRs whenever you're ready.
