# Barakah Hub — `next-app/`

The active Next.js 16 codebase. For project overview, branching, and the
GitHub setup runbook see the [root README](../README.md). This file is
the dev-facing reference: stack decisions, security model, common commands.

---

## Stack

**Next.js 16** (App Router, RSC) · **React 19** · **TypeScript 5.6 (strict)** ·
**Tailwind v4** (CSS `@theme` tokens) · **Drizzle ORM 0.45** ·
**Neon Postgres** (HTTP driver) · **Better-Auth 1.6** (email + password) ·
**Resend** (password-reset email) · **Vitest 4 + RTL** ·
**Cloudflare Workers** (deployed via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)).

UI primitives: hand-rolled [Shadcn](https://ui.shadcn.com)-style components
backed by Radix (Dialog, DropdownMenu, Tooltip) plus our own card / button /
input. Motion via the modern `motion` package (Framer Motion's successor).

Observability hooks (Sentry / PostHog) are stubbed in `.env.example` —
not wired yet.

---

## Common commands

```bash
# Dev
pnpm dev                          # http://localhost:3000 (Turbopack)

# Quality gates (same as CI)
pnpm typecheck                    # tsc --noEmit
pnpm lint                         # eslint . (flat config)
pnpm test                         # vitest run — 47 tests
pnpm build                        # next build (production)

# Database
pnpm db:generate                  # drizzle-kit generate (after schema edit)
pnpm db:migrate                   # apply pending migrations to current branch
pnpm db:push                      # push schema directly (dev only)
pnpm db:studio                    # GUI at https://local.drizzle.studio

# Cloudflare Workers
pnpm build:cf                     # OpenNext build → .open-next/
pnpm deploy:cf                    # wrangler deploy
pnpm preview:cf                   # local Worker preview

# Legacy data import (one-shot)
pnpm import:legacy ./<exported>.json
```

---

## Architecture

```
next-app/
├── app/
│   ├── api/auth/[...all]/        Better-Auth catch-all handler
│   ├── login/                    /login + login-form (client)
│   ├── register/                 /register + register-form (client)
│   ├── forgot-password/          /forgot-password
│   ├── reset-password/           /reset-password (token from email)
│   ├── onboarding/               Profile-claim flow after first sign-in
│   ├── (app)/                    Auth-required app shell + every page
│   │   ├── layout.tsx            Topbar + Sidebar + TooltipProvider
│   │   ├── dashboard/
│   │   ├── myaccount/
│   │   ├── tree/
│   │   ├── cases/                Emergency votes
│   │   ├── search/
│   │   ├── settings/
│   │   ├── notifications/
│   │   ├── messages/
│   │   └── admin/                /admin/{audit,broadcast,fund,loans,members}
│   ├── actions.ts                Server actions (Zod-validated)
│   ├── manifest.ts               PWA manifest (dynamic)
│   ├── icon.tsx                  Dynamic favicon (Concept A geometric crescent)
│   ├── globals.css               Tailwind v4 @theme tokens + 11 palettes
│   └── layout.tsx                Root layout (fonts, manifest, Toaster)
│
├── components/
│   ├── ui/                       button, card, input, dialog, dropdown-menu, tooltip
│   ├── icons/crescent.tsx        Shared brand mark (Concept A)
│   ├── stat-card.tsx             Motion-enabled gradient stat card
│   ├── sidebar.tsx               layoutId active-indicator animation
│   ├── topbar.tsx                Search + theme toggle + user dropdown
│   ├── verse-bar.tsx             Quran ticker
│   └── goal-bar.tsx              Family goal progress
│
├── lib/
│   ├── auth.ts                   Better-Auth server config
│   ├── auth-client.ts            Better-Auth React client
│   ├── auth-server.ts            getSession / getUser / getMeOrRedirect
│   ├── db/
│   │   ├── schema.ts             Drizzle schema (all 14 tables)
│   │   └── index.ts              Neon HTTP driver
│   ├── i18n/{dict,verses}.ts
│   ├── month.ts                  monthStartFromLabel() — pure, tested
│   ├── themes.ts                 11 palette keys
│   ├── utils.ts                  cn(), ini(), normalizePkPhone(), pickColor()
│   └── whatsapp.ts               Bilingual templates + phone normalization
│
├── supabase/migrations/          Numbered SQL migrations (folder name kept
│   ├── 0001_initial_schema.sql   for naming continuity; targets Neon now)
│   ├── 0002_security_fixes.sql
│   ├── 0003_rename_to_barakah_hub.sql
│   └── 0004_better_auth_tables.sql
│
├── test/                         Vitest + RTL — 47 tests
│   ├── setup.ts
│   ├── utils.test.ts
│   ├── month.test.ts
│   ├── components/{stat-card,goal-bar}.test.tsx
│   ├── actions/{onboarding,authorization}.test.ts
│   └── helpers/db-mock.ts        Chainable Drizzle + session mock
│
├── docs/
│   ├── BACKEND_ALTERNATIVES.md   Appwrite / PocketBase / Nhost / Turso vs Supabase
│   └── MIGRATING_TO_NEON.md      7-phase Supabase → Neon + Better-Auth playbook
│
├── scripts/
│   └── migrate-localstorage.ts   Legacy single-HTML JSON → Postgres importer
│
├── public/
│   ├── icon.svg                  PWA primary icon (full-bleed crescent)
│   ├── icon-maskable.svg         Adaptive icon (safe-zone padded)
│   └── brand/                    Logo concept proposals (A/B/C) + preview.html
│
├── middleware.ts                 Edge-runtime auth gate (fast, no DB call)
├── wrangler.toml                 Cloudflare Workers config
├── open-next.config.ts           OpenNext adapter config
├── components.json               Shadcn CLI config (style: new-york)
├── DEPLOY.md                     Workers + Neon deploy guide
├── AUDIT_PHASE3.md               Audit + remediation history
├── CONTRIBUTING.md               Branching, commits, review etiquette
└── package.json
```

---

## 🛡 Security model

The app connects to Neon via `lib/db/index.ts` using the HTTP driver,
which authenticates as a privileged role. **Authorization happens in
[`app/actions.ts`](app/actions.ts)** — every mutation passes through a
Zod schema and a `meOrThrow()` / `getMeOrRedirect()` gate that derives
identity from the Better-Auth session cookie.

| Concern | Mitigation |
|---|---|
| Sadqa privacy (members not seeing each other's donations) | Server actions filter by `me.id` for non-admins; tree + dashboard strip foreign totals before crossing the network |
| Plaintext passwords (was: localStorage in legacy app) | Better-Auth — bcrypt-hashed at rest, password column on `accounts` table |
| Session hijack | httpOnly cookies, 30-day sliding expiry, IP + UA captured in `sessions.ip_address` / `user_agent` |
| Onboarding identity hijack | `onboardSelf` derives `userId` + `email` from the session, never the request body. Admin records cannot be self-claimed. |
| Audit log tampering | DB triggers reject `UPDATE`/`DELETE` on `audit_log` regardless of role (migration 0002) |
| Avatar bucket overwrite | Storage migration to R2 pending (Phase 6) — uploads currently disabled |
| SQL injection | Drizzle ORM — parameterized everywhere |
| XSS | React auto-escapes; `dangerouslySetInnerHTML` not used |
| CSRF | All mutations go through Next.js server actions (origin-checked); no open form-POST routes |
| Input validation | Every action parses through a Zod schema before any DB write |

---

## Stack decisions explained

**Why Neon over Supabase Postgres?**
Branch-per-PR DBs (copy-on-write, instant), HTTP driver fits Cloudflare Workers cleanly, Postgres semantics preserved. We landed on Neon after the Supabase project was deleted; see [`docs/MIGRATING_TO_NEON.md`](docs/MIGRATING_TO_NEON.md) for the trade-off table.

**Why Better-Auth over Auth.js (NextAuth) / Clerk / Lucia?**
Open-source + Drizzle-native + TypeScript-first + active development. Auth.js is more battle-tested but heavier; Clerk is hosted with vendor lock-in; Lucia is a library, not a service (more code to own). Better-Auth was the best fit for our stack.

**Why Drizzle over Prisma?**
The schema *is* the types. Zero runtime overhead. Generates raw SQL we audit. No code-generation step. We pay for it with a smaller ecosystem; trade-off worth it at our scale.

**Why Tailwind v4 (no config file)?**
v4 introduces the `@theme` directive in CSS — tokens live with the styles. No JavaScript config to maintain.

**Why Cloudflare Workers (OpenNext) over Pages?**
Cloudflare is consolidating around Workers + Static Assets. The legacy `@cloudflare/next-on-pages` adapter doesn't support Next 16; OpenNext does. New projects should target Workers.

**Why server actions over API routes?**
Less boilerplate. Type-safe end-to-end. Built-in origin check (CSRF). Revalidation built in.

**Why `middleware.ts` and not Next 16's `proxy.ts`?**
`proxy.ts` is locked to the Node.js runtime. OpenNext on Workers runs in V8 isolates and only supports Edge middleware. Switch back when OpenNext ships Node-runtime support.

---

## 🧪 Quality gates

Same four checks CI runs (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)):

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint . (flat config)
pnpm test        # vitest run — 47 tests
pnpm build       # next build (production w/ placeholder env)
```

Test layout:
- `test/utils.test.ts` + `test/month.test.ts` — pure utilities
- `test/components/*.test.tsx` — RTL renders for `GoalBar`, `StatCard`
- `test/actions/*.test.ts` — security gates on `onboardSelf`, `castVote`,
  `approveMember`, `recordRepayment`, `editMember`. Each test mocks
  `@/lib/db` and `@/lib/auth-server` via [`test/helpers/db-mock.ts`](test/helpers/db-mock.ts) so no live DB is needed.

---

## 📍 Status

Phase 3 audit + remediation complete (5 P0 + 11 P1 + 9 P2 fixes). Phases
3 + 4 + 5 of [`docs/MIGRATING_TO_NEON.md`](docs/MIGRATING_TO_NEON.md)
landed on `feat/neon-migration`. Migration to production happens via the
checklist in [`../NEON_TODO.md`](../NEON_TODO.md).

### Pages
- ✅ `/login` — Better-Auth email + password
- ✅ `/register` — self-signup
- ✅ `/forgot-password` — request reset email
- ✅ `/reset-password` — complete reset (token from email)
- ✅ `/onboarding` — 2-step wizard for new + claimed accounts
- ✅ `/dashboard` — stat cards (chronological sparklines), goal bar, sadqa privacy banner
- ✅ `/myaccount` — verified vs pending payment history + donation form
- ✅ `/tree` — interactive SVG family tree, server-filtered totals
- ✅ `/cases` — emergency cases + voting + new-case form
- ✅ `/search` — global search across members + cases (+ payments + loans for admins)
- ✅ `/notifications` — inbox with bilingual titles + mark-all-read
- ✅ `/messages` — send to admin + inbox + mark-all-read
- ✅ `/settings` — profile (photo upload TODO), 11-palette picker, admin config
- ✅ `/admin/{members,fund,loans,broadcast,audit}` — full CRUD

### Backend
- ✅ Schema + 4 migrations (0001-0004)
- ✅ Better-Auth (email + password, sessions, password-reset)
- ✅ ~21 server actions (Zod-validated): `approveMember`, `addMember`,
  `editMember`, `recordPayment`, `submitDonation`, `verifyPayment`,
  `rejectPayment`, `castVote`, `createCase`, `issueLoan`, `recordRepayment`,
  `updateGoal`, `updateProfile`, `updateAdminConfig`, `softDeleteMember`,
  `hardDeleteMember`, `markAllNotificationsRead`, `markAllMessagesRead`,
  `sendMessage`, `broadcastNotification`, `onboardSelf`

### Open backlog
- **Phase 6 (R2 storage)** for avatar upload — currently stubbed
- Resend domain verification for password-reset deliverability
- Wider integration tests against an ephemeral Neon branch
- Missing legacy features: leaderboard, branch analytics, donut chart,
  province distribution, streak counter, bulk WhatsApp, JSON
  backup/restore, audit filter+CSV
- Observability (Sentry, PostHog)
- Multi-tenant scaffolding (deferred)

---

> *وَأَنفِقُوا۟ مِن مَّا رَزَقْنَـٰكُم* — *And spend from what We have provided you* — Al-Munafiqun 63:10

**JazakAllah Khair.**
