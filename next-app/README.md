# BalochSath · Next.js Phase 3

> Modern rebuild of the single-HTML BalochSath app.
> **Next.js 16 (App Router) + TypeScript + Tailwind v4 + Drizzle ORM + Supabase (Postgres + Auth + Realtime + Storage).**

This is a parallel implementation. The original `index.html` at the repo root keeps working — this folder is the path forward when:

- Multi-device sync is needed
- Real auth (vs plaintext localStorage passwords) is required
- Cloud photo storage is required
- 100+ users need to log in concurrently
- Server-side audit immutability matters

---

## ⚙️ Setup (one-time)

### 1. Create Supabase project

1. Sign up at https://supabase.com (free)
2. Create a project — pick a region close to your family
3. Wait ~2 minutes for it to provision

### 2. Run the SQL migration

```bash
# Open Supabase Dashboard → SQL Editor → New Query
# Paste the contents of supabase/migrations/0001_initial_schema.sql
# Click Run
```

This creates all tables, indexes, enums, and **Row Level Security** policies.
The RLS policies enforce *sadqa privacy at the database layer* — even a malicious client cannot read other members' donation amounts.

### 3. Get your credentials

Supabase Dashboard → **Project Settings** → **API**:
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon public key
- `SUPABASE_SERVICE_ROLE_KEY` — **service_role** secret (keep server-only!)

Supabase Dashboard → **Settings** → **Database** → **Connection String** → **Transaction** mode (port 6543):
- `DATABASE_URL`

### 4. Local env

```bash
cd next-app
cp .env.example .env.local
# fill in values from above
```

### 5. Install + run

```bash
# We recommend pnpm but npm/yarn/bun all work
pnpm install
pnpm dev
```

App boots at http://localhost:3000

### 6. Create your first admin

In Supabase Dashboard → **Authentication** → **Users** → **Add User**:
- Email: your email
- Password: choose one
- Auto-confirm: ✓

Then in **SQL Editor** run this once to link your auth user → members row:

```sql
INSERT INTO members (auth_id, username, name_ur, name_en, father_name, role, status, needs_setup)
VALUES (
  'YOUR-AUTH-USER-UUID-FROM-AUTH.USERS-TABLE',
  'admin',
  'منتظم',
  'Admin',
  'Setup',
  'admin',
  'approved',
  true
);
```

Login at http://localhost:3000/login. The first-login wizard takes over.

---

## 📦 Migrating data from the single-HTML app

If you already have data in the old `index.html`:

1. Open the old app → **Settings → Danger Zone → ⬇ Export**
2. Save the JSON file (e.g. `balochsath-2026-05-07.json`)
3. From `next-app/`:

   ```bash
   pnpm import:legacy ./path/to/balochsath-2026-05-07.json
   ```

The script:
- Inserts members, preserving usernames + father names + parent links
- Imports payments with verified/pending flags intact
- Imports loans, repayments, audit log entries
- Restores config (vote threshold, goal, theme)

It's idempotent on `username` — safe to re-run.

> Note: Members imported via this script have `auth_id = null` until each member signs up via Supabase Auth. The wizard prompts them to claim their account using their `username`.

---

## 🚀 Deploy

### Vercel + Supabase (free)

1. Push this folder as a project root to Vercel
2. Set env vars in Vercel project settings (same as `.env.local`)
3. Vercel auto-deploys on push to `main`

URL: `https://your-project.vercel.app`

### Costs at family scale (50–200 users)
- Vercel: **$0** (Hobby tier covers this easily)
- Supabase: **$0** (free tier: 500MB DB, 1GB storage, 50K MAU)

Total: $0/month until you hit 1000+ active users.

---

## 🗂 Architecture

```
next-app/
├── app/                                # Next.js 16 App Router
│   ├── layout.tsx                      # Root layout (fonts, manifest, theme)
│   ├── page.tsx                        # Redirect: → /dashboard or /login
│   ├── globals.css                     # Tailwind v4 @theme + 11 palettes
│   ├── login/                          # Public route
│   │   ├── page.tsx
│   │   └── login-form.tsx
│   ├── (app)/                          # Protected route group
│   │   ├── layout.tsx                  # Auth gate + sidebar + topbar shell
│   │   ├── dashboard/page.tsx
│   │   ├── myaccount/page.tsx
│   │   ├── members/                    # admin
│   │   ├── tree/
│   │   ├── settings/
│   │   └── ...
│   └── actions.ts                      # Server actions (mutations)
│
├── components/
│   ├── ui/                             # Primitive components (button, card, input)
│   ├── stat-card.tsx                   # Adminty-style gradient card
│   ├── sidebar.tsx
│   ├── topbar.tsx
│   ├── verse-bar.tsx                   # Quran ticker
│   └── goal-bar.tsx
│
├── lib/
│   ├── db/
│   │   ├── schema.ts                   # Drizzle table definitions
│   │   └── index.ts                    # Drizzle client (postgres-js)
│   ├── supabase/
│   │   ├── client.ts                   # Browser client
│   │   ├── server.ts                   # Server client (per-request)
│   │   └── middleware.ts               # Session refresh + auth gate
│   ├── i18n/
│   │   ├── dict.ts                     # UR/EN strings
│   │   └── verses.ts                   # Quran verse rotation
│   ├── themes.ts                       # 11 palette keys
│   └── utils.ts                        # cn(), ini(), normalizePkPhone()
│
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql     # Tables + indexes + RLS policies
│       └── 0002_security_fixes.sql     # Avatar policy + month_start + audit triggers
│
├── scripts/
│   └── migrate-localstorage.ts         # Legacy JSON → Postgres importer
│
├── test/                               # Vitest + RTL — 48 tests
│   ├── utils.test.ts
│   ├── month.test.ts
│   ├── components/
│   ├── actions/                        # Security-critical action tests
│   ├── helpers/db-mock.ts
│   └── setup.ts
│
├── proxy.ts                            # Next 16 proxy (was: middleware.ts) — Supabase session refresh
├── next.config.mjs
├── tailwind.config.ts                  # (none needed — using v4 @theme)
├── tsconfig.json
├── drizzle.config.ts
└── package.json
```

---

## 🛡 Security model

The app connects to Postgres via `lib/db/index.ts` using `DATABASE_URL`,
which authenticates as a privileged role and **bypasses** the RLS policies
in the migration. The RLS policies are documentation of intent + protection
for any future direct-REST access via `supabase.from(...)` — they do not
cover the Drizzle code path. **Authorization happens in [app/actions.ts](app/actions.ts)**,
which every mutation goes through.

| Concern | Mitigation |
|---|---|
| Sadqa privacy (members not seeing each other's donations) | Server actions filter by `me.id` for non-admins; tree/dashboard strip foreign totals before crossing the network |
| Plaintext passwords (was: localStorage) | Supabase Auth — bcrypt-hashed, never seen by app code |
| Onboarding identity hijack | `onboardSelf` derives `authId`/`email` from the session cookie, never the request body. Admin records cannot be self-claimed. |
| Audit log tampering | DB triggers reject UPDATE/DELETE on `audit_log` regardless of role (migration 0002) |
| Avatar bucket overwrite | Storage policy restricts insert/update to `(storage.foldername(name))[1] = auth.uid()::text` (migration 0002) |
| SQL injection | Drizzle ORM — parameterized everywhere |
| XSS | React auto-escapes; `dangerouslySetInnerHTML` not used |
| CSRF | All mutations go through Next.js server actions (origin-checked); approve flow no longer uses an open form-POST route |
| Input validation | Every action parses through a Zod schema before any DB write |

---

## 🔑 Stack decisions explained

**Why PERN over MERN?**
Family data is highly relational (parent → children, member → payments → verifications, case → votes). Postgres handles this naturally with foreign keys, while MongoDB would force denormalized embedding or join-emulation. Postgres also gives us RLS for free.

**Why Drizzle over Prisma?**
Drizzle is type-safer (the schema *is* the types), has zero runtime overhead, generates raw SQL we can audit, and works without a code-generation step. Prisma is fine; Drizzle is faster to iterate.

**Why Supabase over self-hosted Postgres?**
We get auth + storage + realtime channels + dashboard + RLS-aware APIs in one product. For a family-scale tool, the free tier covers everything indefinitely.

**Why Tailwind v4 (no config file)?**
v4 introduces the `@theme` directive in CSS. Tokens live with the styles. No JavaScript config to maintain.

**Why server actions over API routes?**
Less boilerplate. Type-safe end-to-end. Automatic CSRF protection. Revalidation built in.

---

## 🧪 Quality gates

The same four checks CI runs (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)):

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint . (flat config)
pnpm test        # vitest run — 48 tests across utils, components, security-critical actions
pnpm build       # next build (production)
pnpm db:studio   # open Drizzle Studio at https://local.drizzle.studio
```

Test layout:
- `test/utils.test.ts`, `test/month.test.ts` — pure utilities
- `test/components/*.test.tsx` — RTL renders for `GoalBar`, `StatCard`
- `test/actions/*.test.ts` — security gates on `onboardSelf`, `castVote`,
  `approveMember`, `recordRepayment`, `editMember`. Each test mocks `@/lib/db`
  and `@/lib/supabase/server` via `test/helpers/db-mock.ts` so no live DB is
  needed.

---

## 📍 Status

**Phase 3 ships complete (60+ files, ~6,000 lines), audited and remediated:**

The audit + fix history is in [`AUDIT_PHASE3.md`](AUDIT_PHASE3.md) — it covers:
- 5 P0 (security) findings, all fixed
- 11 P1 (functionality) gaps, all fixed
- 10 P2 (perf/correctness) drifts, all fixed

Open backlog (P3 — explicit follow-ups):
- Tests cover security gates + utilities + a couple of components; broader UI
  coverage and an integration suite against a test Postgres are next steps.
- AUDIT.md feature gaps still open: leaderboard, branch analytics, donut
  chart, province distribution, streak counter, bulk WhatsApp, JSON
  backup/restore, audit filter+CSV.
- Observability (Sentry/PostHog) and multi-tenant scaffolding deferred.



### Pages
- ✅ `/login` — Supabase email/password
- ✅ `/forgot-password` — magic-link reset
- ✅ `/onboarding` — 2-step wizard for new + claimed accounts (session-derived identity)
- ✅ `/dashboard` — stat cards (chronological sparklines), goal bar, sadqa privacy banner
- ✅ `/myaccount` — verified vs pending payment history + member donation form
- ✅ `/tree` — interactive SVG family tree, server-filtered totals (admins see all, members see own only)
- ✅ `/cases` — emergency cases + voting + new-case form
- ✅ `/search` — global search across members + cases (+ payments + loans for admins)
- ✅ `/notifications` — inbox with bilingual titles + mark-all-read
- ✅ `/messages` — send to admin + inbox + mark-all-read
- ✅ `/settings` — profile form, photo upload, 11-palette picker, admin config
- ✅ `/admin/members` — full CRUD via dialog (add + edit + approve + soft/hard delete) with city/province/status filters
- ✅ `/admin/fund` — pool totals, pending verifications, recent history, record form
- ✅ `/admin/loans` — issue qarz form, active loans with progress + per-row repayment, repaid history
- ✅ `/admin/broadcast` — bilingual title/body to all members
- ✅ `/admin/audit` — append-only activity journal (DB triggers enforce immutability)

### Backend
- ✅ Database schema + RLS policies (Postgres, sadqa privacy enforced at DB layer)
- ✅ Auth (Supabase SSR + middleware session refresh)
- ✅ 19 server actions (typed via Zod): `approveMember`, `addMember`,
  `editMember`, `recordPayment`, `submitDonation`, `verifyPayment`,
  `rejectPayment`, `castVote`, `createCase`, `issueLoan`, `recordRepayment`,
  `updateGoal`, `updateProfile`, `updateAdminConfig`, `softDeleteMember`,
  `hardDeleteMember`, `markAllNotificationsRead`, `markAllMessagesRead`,
  `sendMessage`, `broadcastNotification`, `onboardSelf`
- ✅ Legacy data migration script (`scripts/migrate-localstorage.ts`)

### Infrastructure
- ✅ PWA: `app/manifest.ts` + dynamic `app/icon.tsx`
- ✅ WhatsApp helpers (`lib/whatsapp.ts`) — phone normalization + Urdu templates
- ✅ 11 theme palettes ported as CSS layers
- ✅ Sonner toast notifications
- ✅ Lucide-react icons
- ✅ TanStack Query ready (caching layer for client interactions)
- ✅ Tailwind v4 with @theme tokens
- ✅ TypeScript strict mode end-to-end

---

**JazakAllah Khair.**
