# Barakah Hub

> Islamic family-fund SaaS — sadqa, qarz-e-hasana, emergency vote, append-only audit trail.

**بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ**

Barakah Hub is a privacy-first treasury app for extended families and small
communities to pool monthly donations, issue interest-free loans
(*qarz-e-hasana*), and approve emergency cases by majority vote — with the
*sadqa* principle of donor-name privacy enforced at the data layer.

Stack: **Next.js 16 · React 19 · TypeScript · Drizzle ORM · Neon Postgres ·
Better-Auth · Tailwind v4 · Vitest · Cloudflare Workers (OpenNext)**.

---

## At a glance

| | |
|---|---|
| **Active codebase** | [`next-app/`](next-app/) — Next.js 16 App Router |
| **Legacy predecessor** | [`index.html`](index.html) — single-HTML PWA (frozen, kept for data-import reference) |
| **Database** | Neon Postgres (serverless, branch-per-PR via [`@neondatabase/serverless`](https://neon.tech)) |
| **Auth** | [Better-Auth](https://www.better-auth.com) — email + password, sessions, password-reset via Resend |
| **Migrations** | [`next-app/supabase/migrations/`](next-app/supabase/migrations/) — `0001` → `0004`, applied in order |
| **Tests** | 47 in [`next-app/test/`](next-app/test/) — `pnpm test` |
| **CI** | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — typecheck → lint → test → build |
| **Deploy target** | Cloudflare Workers via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) — auto-deploy on merge to `main` |
| **Live URL** | <https://barakahhub.bakerabi91.workers.dev> |
| **Audit history** | [`next-app/AUDIT_PHASE3.md`](next-app/AUDIT_PHASE3.md) — every P0/P1/P2 finding with status |
| **Migration history** | [`next-app/docs/MIGRATING_TO_NEON.md`](next-app/docs/MIGRATING_TO_NEON.md) — Supabase → Neon + Better-Auth playbook |

---

## Quick start

```bash
# 1 · Clone
git clone https://github.com/<your-account>/barakah-hub.git
cd barakah-hub/next-app

# 2 · Install (pnpm 9+)
pnpm install

# 3 · Environment
cp .env.example .env.local
# Fill in:
#   DATABASE_URL          — Neon pooled URL (ends in -pooler...neon.tech)
#   DATABASE_URL_DIRECT   — Neon direct URL (no pooler — for migrations)
#   BETTER_AUTH_SECRET    — `openssl rand -base64 32`
#   NEXT_PUBLIC_APP_URL   — http://localhost:3000 in dev

# 4 · Apply migrations to your Neon branch
pnpm db:migrate

# 5 · Run
pnpm dev                          # http://localhost:3000
# Visit /register to create the first admin account
# Promote to admin (one-off):
#   psql "$DATABASE_URL_DIRECT" -c "UPDATE members SET role='admin', status='approved' WHERE id=(SELECT id FROM members ORDER BY created_at LIMIT 1)"
```

Migrations (run via `pnpm db:migrate`):

1. `0001_initial_schema.sql` — domain tables, indexes, RLS policies (RLS bypassed by app — see security model)
2. `0002_security_fixes.sql` — avatar policy, `month_start`, audit-log triggers, notification titles
3. `0003_rename_to_barakah_hub.sql` — config defaults
4. `0004_better_auth_tables.sql` — `users`, `sessions`, `accounts`, `verifications` for Better-Auth

Full deploy guide: [`next-app/DEPLOY.md`](next-app/DEPLOY.md).

---

## What's in scope

**Core product**
- Multi-pool fund (Sadaqah / Zakat / Qarz) with admin-verified payments
- Member self-submitted donations with approval queue
- Family tree with sibling auto-detection from father name
- Emergency-vote cases with configurable threshold (30–75 %)
- Interest-free loans (*qarz-e-hasana*) with repayment tracking
- Append-only audit log enforced by DB triggers
- Bilingual UI (Urdu RTL · English LTR)
- PWA installable, offline shell

**Privacy / security posture**
- *Sadqa* privacy enforced server-side: non-admin members never see other
  members' totals (verified by [`test/actions/onboarding.test.ts`](next-app/test/actions/onboarding.test.ts))
- Onboarding identity derived from Better-Auth session cookie, not request body
- Sessions: 30-day sliding window, httpOnly cookies, edge-validated via `getSessionCookie`
- Audit log immutable at the DB layer (UPDATE/DELETE triggers in migration 0002)
- Every server action passes through Zod input validation
- Avatar storage migration to R2 pending (Phase 6) — uploads currently disabled

See [`next-app/README.md#-security-model`](next-app/README.md) for the full table.

---

## Repository layout

```
barakah-hub/
├── README.md                     ← this file (project entry point)
├── NEON_TODO.md                  Operational checklist for Neon + Better-Auth migration
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci.yml                typecheck · lint · test · build on every PR
│       ├── deploy.yml            wrangler deploy on push to main
│       ├── neon-pr-branch.yml    Branch-per-PR Neon DB
│       └── neon-cleanup.yml      Delete PR-branch on close
│
├── next-app/                     active Next.js 16 codebase
│   ├── app/
│   │   ├── api/auth/[...all]/    Better-Auth catch-all handler
│   │   ├── login/ register/      Auth UI
│   │   ├── forgot-password/      Reset request
│   │   ├── reset-password/       Reset completion (token-based)
│   │   ├── onboarding/           Member-record claim flow
│   │   ├── (app)/                Auth-required app shell
│   │   └── actions.ts            Server actions (Zod-validated)
│   ├── components/               UI (Shadcn primitives + custom)
│   ├── lib/
│   │   ├── auth.ts               Better-Auth server config
│   │   ├── auth-client.ts        Better-Auth React client
│   │   ├── auth-server.ts        getSession / getMeOrRedirect helpers
│   │   ├── db/                   Drizzle + Neon HTTP driver
│   │   └── ...
│   ├── supabase/migrations/      Numbered SQL migrations 0001-0004
│   │                             (folder kept for naming continuity; targets Neon)
│   ├── test/                     Vitest + RTL — 47 tests
│   ├── docs/
│   │   ├── BACKEND_ALTERNATIVES.md
│   │   └── MIGRATING_TO_NEON.md
│   ├── scripts/                  Legacy-data importer
│   ├── middleware.ts             Edge-runtime auth gate (Workers requirement)
│   ├── wrangler.toml             Cloudflare Workers config
│   ├── open-next.config.ts       OpenNext adapter config
│   ├── README.md                 Stack decisions, security, status
│   ├── DEPLOY.md                 Cloudflare Workers + Neon deploy guide
│   ├── AUDIT_PHASE3.md           Audit + remediation history
│   └── CONTRIBUTING.md           Branching, commits, review etiquette
│
├── index.html                    legacy single-HTML predecessor (frozen)
├── manifest.json                 legacy PWA manifest
├── sw.js                         legacy service worker
└── AUDIT.md                      legacy audit (Phase 1)
```

---

## Branching strategy — **GitHub Flow**

We use **GitHub Flow** rather than Gitflow. Family-scale tooling does not
need release branches; small, frequent, always-deployable PRs into `main`
are simpler and pair well with Cloudflare Pages preview deployments.

```
main ──●──●──●──●──●─────●──● (always deployable; CI required)
        \         \       \
         feat/x    fix/y   chore/z
```

**Rules**

| Rule | Why |
|---|---|
| `main` is the only long-lived branch | Single source of truth |
| Branches are short-lived: feature, fix, chore, docs | Reduce merge debt |
| Branch from `main`, PR back into `main` | No staging branch to drift |
| CI must be green before merge | Typecheck + lint + test + build |
| Squash-merge by default | Linear history, easy to revert |
| Delete branch after merge | Keep the branch list useful |

**Branch naming**

```
<type>/<short-kebab-summary>

feat/loan-repayment-form
fix/sparkline-month-order
chore/upgrade-tailwind
docs/contributing-guide
ci/cache-pnpm-store
test/cast-vote-rules
```

Detail in [`next-app/CONTRIBUTING.md`](next-app/CONTRIBUTING.md).

---

## DevOps workflow

**CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) — runs on every PR:

```
push / PR → checkout → setup-node + pnpm cache
        → pnpm install --frozen-lockfile
        → pnpm typecheck
        → pnpm lint
        → pnpm test          (47 unit / component / action tests)
        → pnpm build         (production Next.js build w/ placeholder env)
        → ✅ ready to merge / deploy
```

**Per-PR Neon database** ([`.github/workflows/neon-pr-branch.yml`](.github/workflows/neon-pr-branch.yml))
— each PR spins up an isolated Neon branch via copy-on-write, applies
migrations, and posts the connection URL as a sticky comment on the PR.
The cleanup workflow deletes the branch when the PR closes.

**Production deploy** ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))
— on push to `main`, OpenNext bundles the app and `cloudflare/wrangler-action`
deploys to the `barakahhub` Worker. Gated by GitHub's `production`
environment so deploys can require manual approval.

---

## **Pushing to GitHub**

The local working tree is already a git repository on `main` with commits.
Pick the path that matches your situation.

### Path A · The repo already exists on GitHub under the old name *(your situation)*

Today: `git remote -v` shows `origin → github.com/<account>/balochsath.git`.
We rename the GitHub repo, update the local remote, then push.

**1 · Rename the GitHub repo *(critical — do this first)***

GitHub web UI → repo home → **Settings → General → Repository name** →
change `balochsath` to `barakah-hub` → **Rename**. GitHub keeps redirects
from the old URL so existing clones, links, and CI integrations don't
break immediately.

**2 · Update the local remote URL**

```bash
# Confirm what you have:
git remote -v
# Update origin to the new URL:
git remote set-url origin https://github.com/<account>/barakah-hub.git
# Verify:
git remote -v
```

**3 · Stage + commit the rename**

```bash
git add -A
git status                                  # review
git commit -m "chore: rename project to Barakah Hub"
```

**4 · Push *(essential)***

```bash
git push origin main
```

Cloudflare Pages and any other GitHub integrations will follow the
redirect; update them to the new URL at your leisure.

---

### Path B · Pushing to a brand-new GitHub repo

Use this if the repo doesn't exist on GitHub yet, or if you want a fresh
repo under a different account.

**1 · Configure git identity *(once per machine)***

```bash
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase true        # avoid merge bubbles
```

**2 · Create the empty GitHub repository**

*Option A · GitHub CLI (one command):*

```bash
gh auth login                                # browser-based, one-off
gh repo create barakah-hub \
  --private \
  --source=. \
  --remote=origin \
  --description "Barakah Hub — Islamic family-fund SaaS (Next.js 16 + Postgres)"
```

*Option B · GitHub web UI:*

1. Open <https://github.com/new>
2. Repository name: `barakah-hub`
3. **Do not** initialise with README / .gitignore / license — we already have those locally.
4. Create.
5. Wire it up locally:

```bash
git remote add origin git@github.com:<account>/barakah-hub.git
```

**3 · Verify + push *(essential)***

```bash
git status                                   # should be clean
git log --oneline -10                        # last 10 commits
git remote -v                                # confirm origin URL
git push -u origin main                      # -u tracks main → origin/main
```

### 5 · Recommended branch protection *(do this immediately after the first push)*

GitHub web UI → **Settings → Branches → Branch protection rules → Add rule**

```
Branch name pattern:           main

✓ Require a pull request before merging
  ✓ Require approvals: 1
  ✓ Dismiss stale approvals on new commit
✓ Require status checks to pass before merging
  ✓ Require branches to be up to date before merging
  ✓ Required check: Typecheck · Lint · Test · Build   (the job from ci.yml)
✓ Require conversation resolution before merging
✓ Require linear history                       (matches squash-merge default)
✓ Do not allow bypassing the above settings
```

### 6 · Wire up Cloudflare Pages

GitHub web UI → **Settings → Integrations → GitHub Apps → Cloudflare Pages**.
In the Cloudflare dashboard, create a new project named `barakah-hub`,
connect it to the GitHub repo, and set the build settings as documented in
[`next-app/DEPLOY.md`](next-app/DEPLOY.md). Production deploys from `main`;
preview deploys from every PR branch.

### 7 · Daily workflow from here

```bash
git switch -c feat/short-summary             # branch off main
# ...edit, commit (small, focused commits)...
git push -u origin feat/short-summary
gh pr create --fill                          # or open via web UI
# CI runs · review · squash-merge · auto-deploy
```

---

## Quality gates (run before pushing)

```bash
cd next-app
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint . (flat config)
pnpm test           # vitest run — 48 tests
pnpm build          # next build (production)
```

These are the same four steps CI runs — if they pass locally, the PR will
pass CI. The npm-style script equivalents are in [`next-app/package.json`](next-app/package.json).

---

## Status

Phase 3 audit + remediation complete (5 P0 + 11 P1 + 9 P2 fixes).
**Phases 3 + 4 + 5 of the Neon migration shipped on `feat/neon-migration`**:
DB swapped from Supabase Postgres → Neon, Auth swapped from Supabase Auth →
Better-Auth, deploy target migrated from Cloudflare Pages → Workers via
OpenNext. 47 tests green, CI runs typecheck/lint/test/build, branch-per-PR
Neon DBs, project renamed **Barakah Hub**.

Open backlog (P3 / Phase 6, see
[`next-app/AUDIT_PHASE3.md`](next-app/AUDIT_PHASE3.md) +
[`NEON_TODO.md`](NEON_TODO.md)):

- **Phase 6 — R2 storage** for avatars (currently stubbed in profile-form.tsx;
  members can paste public image URLs as a workaround)
- Resend domain verification so password-reset emails deliver
- Wider integration test coverage against an ephemeral Neon branch
- Missing legacy features: leaderboard, branch analytics, donut chart,
  province distribution, streak counter, bulk WhatsApp, JSON backup/restore,
  audit filter+CSV
- Observability (Sentry, PostHog)
- Multi-tenant scaffolding (deferred — current scope is single-tenant)

---

## License

Internal use. Not for redistribution. *(Add an SPDX-tagged LICENSE file
when ready to open-source — `MIT`, `Apache-2.0`, and `AGPL-3.0` are the
common choices for SaaS code.)*

---

> *وَأَنفِقُوا۟ مِن مَّا رَزَقْنَـٰكُم* — *And spend from what We have provided you* — Al-Munafiqun 63:10

**JazakAllah Khair.**
