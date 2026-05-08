# Deploy Guide — Barakah Hub on Cloudflare Pages + Supabase

> Replace placeholders below with your real values:
> - `<your-project>` — your Supabase project ref (the slug in the dashboard URL)
> - `<cf-account-id>` — your Cloudflare account ID
> - `<region>` — Supabase Postgres region (e.g. `ap-south-1`, `us-east-1`)

---

## ❓ Where do I run `pnpm install`?

**Inside `next-app/`** — that's where the Next.js app lives. From the repo root:

```powershell
cd "<repo-root>/next-app"
pnpm install
```

If you don't have `pnpm`, install it first: `npm install -g pnpm` (or just use `npm install` — works the same).

After install, run locally:
```powershell
pnpm dev
```
Opens at http://localhost:3000

---

## Part 1 — Set up Supabase (5 minutes)

You already have project [`<your-project>`](https://supabase.com/dashboard/project/<your-project>) ready.

### 1.1 Run the SQL migrations

Apply the migrations in order from `next-app/supabase/migrations/`:

1. Open https://supabase.com/dashboard/project/<your-project>/sql/new
2. Copy everything from `0001_initial_schema.sql` and paste into the SQL editor
3. Click **Run** (you should see `Success. No rows returned`)
4. Open another SQL editor tab and run `0002_security_fixes.sql` the same way

What each migration does:

`0001_initial_schema.sql`
- 10 tables (members, payments, cases, votes, loans, repayments, notifications, messages, audit_log, config)
- 8 enums + indexes
- Row Level Security policies (note: the app currently bypasses RLS via direct Postgres connection — see SECURITY MODEL note in [app/actions.ts](app/actions.ts) — these policies protect any future direct-REST access)
- Storage bucket `avatars` for profile photos

`0002_security_fixes.sql` *(new)*
- P0-3: avatar storage policy now scoped to `auth.uid()` folder (was unrestricted)
- P1-6: `payments.month_start` DATE column for chronological sparkline ordering
- P1-14: `notifications.title_ur` / `title_en` columns
- P0-2 hardening: append-only triggers on `audit_log` (UPDATE/DELETE blocked)

### 1.2 Grab your credentials

Open https://supabase.com/dashboard/project/<your-project>/settings/api

Copy these three values:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` → `https://<your-project>.supabase.co`
- **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (starts with `eyJ...`, very long)
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (also `eyJ...`, **keep server-only**)

### 1.3 Get the Postgres connection string

Open https://supabase.com/dashboard/project/<your-project>/settings/database

Scroll to **Connection string** → choose **Transaction** mode (port `6543`).

Copy the URI. It will look like:
```
postgresql://postgres.<your-project>:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

Replace `[YOUR-PASSWORD]` with your actual database password (set when you created the project — if forgotten, reset it in the same dashboard page).

This is your `DATABASE_URL`.

### 1.4 Create your first admin user

In Supabase dashboard → **Authentication** → **Users** → **Add user**:
- Email: your real email
- Password: pick one
- ✓ Auto Confirm User

Once created, click on the user to copy the **UUID** (User ID).

Then go to **SQL Editor** and run:

```sql
INSERT INTO members (auth_id, username, name_ur, name_en, father_name, role, status, needs_setup, color)
VALUES (
  'PASTE-YOUR-UUID-HERE',
  'admin',
  'منتظم',
  'Admin',
  'Setup',
  'admin',
  'approved',
  true,
  '#c9a84c'
);
```

Replace `PASTE-YOUR-UUID-HERE` with the UUID you copied.

---

## Part 2 — Set up local environment (2 minutes)

```powershell
cd "<repo-root>/next-app"
copy .env.example .env.local
```

Open `.env.local` in your editor and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (the anon key from 1.2)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (the service role key from 1.2)
DATABASE_URL=postgresql://postgres.<your-project>:YOURPASSWORD@aws-0-...pooler.supabase.com:6543/postgres
```

Test locally:
```powershell
pnpm install
pnpm dev
```

Visit http://localhost:3000/login and sign in with the email/password from step 1.4. You should land on the onboarding page → fill it → dashboard.

---

## Part 3 — Deploy to Cloudflare Pages

You already have project [`barakah-hub`](https://dash.cloudflare.com/<cf-account-id>/pages/view/barakah-hub) created. Two paths:

### Path A — Auto-deploy from GitHub (recommended, set once)

1. Go to https://dash.cloudflare.com/<cf-account-id>/pages/view/barakah-hub/settings
2. **Build settings**:
   - **Framework preset:** `Next.js`
   - **Build command:** `npx @cloudflare/next-on-pages`
   - **Build output directory:** `.vercel/output/static`
   - **Root directory (advanced):** `next-app`
   - **Node version:** `20` or `22` (env var: `NODE_VERSION=20`)

3. **Environment variables** → **Production** + **Preview** (set in BOTH):

   | Variable name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<your-project>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (anon key from Supabase API settings) |
   | `SUPABASE_SERVICE_ROLE_KEY` | (service role key — type=`Secret` to encrypt) |
   | `DATABASE_URL` | (Postgres URI from step 1.3 — type=`Secret`) |
   | `NODE_VERSION` | `20` |

4. **Functions** tab → **Compatibility flags**:
   - Production: `nodejs_compat`
   - Preview: `nodejs_compat`

5. **Functions** → **Compatibility date**: `2026-05-07` or later

6. **Deploys** tab → click **Create deployment** → it'll pull from GitHub `main`, run `npx @cloudflare/next-on-pages` in `next-app/`, and ship.

After 2–3 minutes, your app is live at:
**https://barakah-hub.pages.dev**

### Path B — Manual deploy from your machine (one-shot)

```powershell
cd "<repo-root>/next-app"

# 1. Authenticate Wrangler with Cloudflare (browser opens once)
npx wrangler login

# 2. Build the Cloudflare-compatible bundle
pnpm build:cf

# 3. Deploy to your Pages project
pnpm deploy:cf
```

This pushes directly without needing GitHub. Use this for a quick test.

---

## Part 4 — Test deployment

1. Open `https://barakah-hub.pages.dev`
2. Click `/login`
3. Sign in with your admin email/password
4. ✓ Should land on the dashboard

If you see "Unauthorized" or something blank — check the Cloudflare deployment logs (https://dash.cloudflare.com/<cf-account-id>/pages/view/barakah-hub) and verify env vars are set in BOTH Production + Preview environments.

---

## Part 5 — Migrate your existing data (optional)

If you have data in the original single-HTML app you want to bring over:

```powershell
# In the OLD app: Settings → Danger Zone → ⬇ Export
# Save the JSON somewhere, e.g. barakah-hub-2026-05-07.json

cd "<repo-root>/next-app"
pnpm import:legacy ./path/to/barakah-hub-2026-05-07.json
```

This:
- Inserts all members (preserves usernames, father names, parent links)
- Imports payments with verified/pending state intact
- Imports loans, audit log, config (vote threshold, goals)
- Idempotent on `username` — safe to re-run

Members imported this way will have `auth_id = null`. They claim their accounts by:
1. Admin invites them via Supabase Auth (Authentication → Users → Add)
2. They log in with the email
3. The onboarding page auto-claims their existing record by matching `email-prefix → username`

---

## ⚠ Common gotchas

### "Cannot find module 'postgres'" or build fails on Cloudflare

You forgot `compatibility_flags = ["nodejs_compat"]`. Set it in:
- `wrangler.toml` (already done in repo)
- Cloudflare dashboard → Pages → Settings → Functions → Compatibility flags

### "DATABASE_URL is undefined" at runtime

Env vars only load on **next deploy** after you add them. Either:
- Re-trigger a deploy (push a commit, or click "Retry deployment" in dashboard)
- Or use the manual deploy: `pnpm deploy:cf`

### CORS errors from browser

Supabase Auth needs your Cloudflare URL in allowed origins:
- Supabase dashboard → Authentication → URL Configuration
- Add `https://barakah-hub.pages.dev` to **Site URL** + **Redirect URLs**

### "Email not confirmed" on login

Supabase requires email confirmation by default. Either:
- Disable confirmation: Authentication → Providers → Email → uncheck "Confirm email"
- Or click the confirmation link sent to your inbox

### `next-on-pages` build fails with edge runtime errors

Some Next.js features (Image Optimization, certain APIs) don't run on Cloudflare's edge. We've already disabled image optimization in `next.config.mjs`. If you hit other issues, the build log will tell you exactly which route — convert it to use the `nodejs_compat`-friendly equivalent.

---

## Cost summary

| Service | Free tier covers | When you'd pay |
|---|---|---|
| Cloudflare Pages | 500 builds/month, unlimited bandwidth | Never at family scale |
| Supabase | 500 MB DB, 1 GB storage, 50K monthly active users | When you cross 50K MAU |

**Total: $0/month indefinitely.**

---

## Quick command reference

```powershell
# Local dev
cd next-app
pnpm install
pnpm dev                  # http://localhost:3000

# Pre-commit checks (matches CI)
pnpm typecheck            # tsc --noEmit
pnpm lint                 # eslint .
pnpm test                 # vitest run (48 tests)
pnpm build                # next build (full production build)

# Database
pnpm db:studio            # GUI at https://local.drizzle.studio

# Cloudflare deploy
pnpm build:cf             # produces .vercel/output/static
pnpm preview:cf           # local preview at http://127.0.0.1:8788
pnpm deploy:cf            # publishes to Pages

# Migrate from legacy
pnpm import:legacy ./barakah-hub-backup-YYYY-MM-DD.json
```

> **First time on a new machine?** `pnpm install` reads `.npmrc` and hoists
> `typescript` so `pnpm typecheck` works directly. If typecheck errors with
> "Cannot find module 'typescript/bin/tsc'", delete `node_modules` and re-run
> `pnpm install`.

## Continuous integration

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every push
and pull request to `main`:

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test`
5. `pnpm build` (with placeholder env vars — real secrets come from the
   deployment platform at runtime)

Cloudflare Pages auto-deploys from `main` once CI passes (set up in
**Settings → Builds & deployments → Production branch deployments**).

---

**JazakAllah Khair.** If something breaks during deploy, screenshot the error from Cloudflare logs and I'll help debug.
