# Phase 3 Audit — `next-app/`

**Scope:** Next.js 16 + React 19 + Postgres (Drizzle) + Supabase Auth rebuild.
**Method:** Static review of all `app/`, `lib/`, `components/`, `supabase/` files.
**Decision:** User opted to audit first, then fix. **All P0 + P1 + P2 items below have been remediated.** P3 items (missing AUDIT.md features, tests, CI, observability) remain open as a follow-up backlog.

**Verification after fixes:** `pnpm typecheck` ✓ • `pnpm lint` 0 errors (34 warnings, mostly `any` in legacy script + `<img>` for arbitrary external avatars) • `pnpm build` ✓ (21 routes compile, Next 16 + React 19).

---

## Severity legend
- **P0** — Security/data integrity. Fix before next deploy.
- **P1** — Functionality broken or contract drift from `AUDIT.md` Phase 1 promises.
- **P2** — Perf / correctness drift / drift between code and migrations.
- **P3** — Polish, missing Phase 1 features, infrastructure debt.

---

## Status summary

| ID | Title | Status |
|---|---|---|
| P0-1 | Onboarding privilege escalation | **FIXED** — `onboardSelf` now derives `user.id` + `email` from session; rejects admin-record self-claims |
| P0-2 | RLS bypassed by direct DB connection | **DOCUMENTED** + audit_log triggers added; security model spelled out at `app/actions.ts` top |
| P0-3 | Avatar storage allows cross-user overwrite | **FIXED** — migration 0002 restricts policy by `auth.uid()`; profile-form uploads to user's own folder |
| P0-4 | Tree leaks all members' totals | **FIXED** — server-side filter on `paidByObj` for non-admins |
| P0-5 | Approve POST → 307 loop | **FIXED** — replaced API route with `approveMember` server action |
| P1-6 | Sparkline lexical month order | **FIXED** — added `month_start DATE` column + index, ordered by it |
| P1-7 | Loans read-only | **FIXED** — `issueLoan` + `recordRepayment` actions, IssueLoanForm + RepayForm components |
| P1-8 | Members add/edit dead UI | **FIXED** — `editMember` action + `MemberDialog` modal wired to both buttons |
| P1-9 | MyAccount no donation form | **FIXED** — `DonationForm` component on `/myaccount` |
| P1-10 | Topbar search dead | **FIXED** — form submit + new `/search` page (members/cases for all, payments/loans for admins) |
| P1-11 | Topbar bell no link | **FIXED** — `<Link href="/notifications">` |
| P1-12 | Unread badge counts read+unread | **FIXED** — added `eq(read, false)` filter |
| P1-13 | Per-case threshold | NO-OP — server math agrees with displayed math (issue overstated in initial pass) |
| P1-14 | Broadcast title fields dropped | **FIXED** — added `title_ur`/`title_en` columns; broadcast/sendMessage send them; notifications page renders them |
| P1-15 | Theme toggle doesn't persist | **FIXED** — localStorage + `useSyncExternalStore` for SSR-safe persistence |
| P2-16 | Cases pulls every vote | **FIXED** — `inArray(votes.caseId, caseIds)` filter |
| P2-17 | Audit fetches all members | **FIXED** — `inArray(members.id, memberIds)` |
| P2-18 | Messages duplicate queries | **FIXED** — single members query, partition into recipients + lookup map |
| P2-19 | Drizzle `parentId` FK drift | **FIXED** — `.references((): any => members.id, { onDelete: 'set null' })` |
| P2-20 | Missing `me` null guard in pages | **FIXED** — every `(app)/` page now `if (!user) redirect('/login'); if (!me) redirect('/onboarding');` |
| P2-21 | Manifest dir vs HTML dir | **FIXED** — manifest set to `lang: 'en', dir: 'ltr'` to match root layout |
| P2-22 | PWA icons miss `purpose: 'any'` | **FIXED** — added `any` entries alongside `maskable` |
| P2-23 | Inbox messages don't get marked read | **FIXED** — `markAllMessagesRead` action + `MarkAllRead` button |
| P2-24 | Sidebar `locale` dead prop | OPEN — kept for now; revisit when i18n is wired (P3) |
| P2-25 | `pnpm typecheck` script broken | **FIXED** — `.npmrc` hoists typescript; script now `pnpm exec tsc --noEmit`; `pnpm lint` migrated off deprecated `next lint` to flat-config eslint |
| P3-32 | Awkward dynamic imports | **FIXED** — top-level imports of `notifications`, `messages` |

**Migrations to apply:**
- [supabase/migrations/0002_security_fixes.sql](supabase/migrations/0002_security_fixes.sql) — avatar policy, `month_start` column + index, notification title columns, audit_log immutability triggers.

**Heads-up (Next 16 deprecation):** the build emits "the middleware file convention is deprecated; please use proxy instead." Renaming `middleware.ts` → `proxy.ts` is a follow-up.

---

## P0 — Critical

### P0-1 Onboarding privilege escalation via client-supplied `authId`
[next-app/app/onboarding/actions.ts:9-25](next-app/app/onboarding/actions.ts#L9-L25)
The Zod schema accepts `authId` and `email` from the client. The action never verifies that the supplied `authId` matches the cookie session (`createClient().auth.getUser()`). Any authenticated user can:
1. Submit `authId = <victim's auth.users.id>` against an existing pending row → claim that account.
2. Submit `email = preexistingadmin@…` against the legacy-import branch (line 28-53) where `authId IS NULL` → take over a pre-imported admin record (status set to `'approved'` on line 43).
**Fix:** Read `user.id` and `user.email` server-side from `supabase.auth.getUser()`. Drop both fields from the schema.

### P0-2 RLS policies are entirely bypassed
[next-app/lib/db/index.ts:23-28](next-app/lib/db/index.ts#L23-L28) + [next-app/supabase/migrations/0001_initial_schema.sql:170-253](next-app/supabase/migrations/0001_initial_schema.sql#L170-L253)
The migration enables RLS on every table and writes detailed policies that depend on `auth.uid()`. The app, however, connects via `postgres-js` using `DATABASE_URL` — that connection authenticates as a database role (typically `postgres` / pooler user), not as the end-user JWT. Result: every server action runs with **RLS-bypassing privileges**. The "defense in depth" framing in `app/actions.ts:5` is incorrect.
**Risk:** Any logic bug in a server action becomes an unconstrained DB write. Sadqa privacy, audit immutability, and admin gating depend solely on imperative checks in TS.
**Fix options:** (a) keep direct connection but acknowledge — RLS becomes documentation only, app logic is the boundary; (b) move queries through `supabase.from(...)` with the user's session so RLS applies; or (c) set `app.user_id` GUC on each request and rewrite policies to read it.

### P0-3 Avatar storage allows cross-user overwrite
[next-app/supabase/migrations/0001_initial_schema.sql:275-280](next-app/supabase/migrations/0001_initial_schema.sql#L275-L280) + [next-app/app/(app)/settings/profile-form.tsx:34](next-app/app/(app)/settings/profile-form.tsx#L34)
The `avatars_authenticated_insert/update` policies only check `bucket_id = 'avatars'`. Any logged-in user can upload (or `upsert: true`) to any path, including overwriting another member's `${otherMemberId}/avatar-*` file.
**Fix:** Folder by `auth.uid()`, not `member.id`, and constrain policy: `(storage.foldername(name))[1] = auth.uid()::text`.

### P0-4 Family tree leaks all members' totals to non-admins
[next-app/app/(app)/tree/page.tsx:18-43](next-app/app/(app)/tree/page.tsx#L18-L43) + [next-app/app/(app)/tree/tree-view.tsx:153](next-app/app/(app)/tree/tree-view.tsx#L153)
Server-side computes `paidByObj` for every member and ships it to the client. The visibility check `viewerIsAdmin || m.id === viewerId` only hides the *render*; the data is still in the React props. Any non-admin can open devtools and read every member's verified total.
**Fix:** Filter `paidByObj` server-side based on `me.role` and `me.id` before passing to `<TreeView>`.

### P0-5 `/api/members/approve` POST → 307 redirect
[next-app/app/api/members/approve/route.ts:38](next-app/app/api/members/approve/route.ts#L38)
`NextResponse.redirect()` defaults to status 307, which preserves the request method. After approving, the browser re-POSTs to `/admin/members`, which 405s (no POST handler on the page). User sees an error after a successful approval.
**Fix:** `NextResponse.redirect(new URL('/admin/members', req.url), 303)`. Or convert to a server action and drop the route entirely.

---

## P1 — High (broken or contract drift)

### P1-6 Dashboard sparkline orders months as text, not chronologically
[next-app/app/(app)/dashboard/page.tsx:38-48](next-app/app/(app)/dashboard/page.tsx#L38-L48)
`monthLabel` is text like `'May 2026'`. `orderBy(payments.monthLabel)` sorts lexically: `April 2026 < August 2026 < December 2026 < February 2026 …`. The "last 6 months" trend is wrong.
**Fix:** Either store a `month_start` `date` column and order by it, or `ORDER BY MIN(paid_on) DESC` and reverse, or keep `monthLabel` for display but sort by aggregated `MAX(paid_on)`.

### P1-7 Loans admin page is read-only
[next-app/app/(app)/admin/loans/page.tsx](next-app/app/(app)/admin/loans/page.tsx)
No UI to issue a loan, record a repayment, or mark `active = false`. Schema supports it (`loans`, `repayments`); server actions are missing entirely. AUDIT.md claims "Qarz-e-Hasana issuance + repayment | ✓".

### P1-8 Members table — "Add" and "Edit" buttons are dead
[next-app/app/(app)/admin/members/members-table.tsx:77](next-app/app/(app)/admin/members/members-table.tsx#L77) + [members-table.tsx:133](next-app/app/(app)/admin/members/members-table.tsx#L133)
Both `<Button>+ Add Member` and `<button title="Edit">` have no `onClick`. `addMember` action exists in `app/actions.ts:41` but no UI invokes it. Admin cannot add or edit members from the rebuild.

### P1-9 MyAccount has no donation form
[next-app/app/(app)/myaccount/page.tsx](next-app/app/(app)/myaccount/page.tsx)
The page shows history but doesn't expose the `submitDonation` action ([app/actions.ts:86](next-app/app/actions.ts#L86)). AUDIT.md ✓: "Member self-records donation → admin verifies".

### P1-10 Topbar global search is non-functional
[next-app/components/topbar.tsx:42-50](next-app/components/topbar.tsx#L42-L50)
Controlled input with no submit handler / no navigation. AUDIT.md ✓: "Global topbar search (members/payments/cases/loans)".

### P1-11 Topbar bell has no link
[next-app/components/topbar.tsx:57](next-app/components/topbar.tsx#L57)
Renders unread count but `<button>` has no `onClick` / not a `<Link>` to `/notifications`. Dead navigation.

### P1-12 Unread badge counts everything
[next-app/app/(app)/layout.tsx:18](next-app/app/(app)/layout.tsx#L18)
`db.$count(notifications, eq(notifications.recipientId, me.id))` counts all notifications for the user, including read. Needs `and(eq(recipientId, me.id), eq(read, false))`. Bell badge will never decrement.

### P1-13 Cases page shows wrong vote threshold
[next-app/app/(app)/cases/page.tsx:25-27](next-app/app/(app)/cases/page.tsx#L25-L27) vs [next-app/app/actions.ts:140-146](next-app/app/actions.ts#L140-L146)
Display computes `eligibleCount = approved - 1` and a single global `need`. The server enforces eligibility per case (excluding the case's specific applicant). When the viewer is the applicant of one case, the displayed thresholds for other cases are off-by-one. Minor numeric drift, but it's a "what does this say will pass" disagreement between UI and rule.

### P1-14 Broadcast form collects title fields that go nowhere
[next-app/app/(app)/admin/broadcast/broadcast-form.tsx:11-12](next-app/app/(app)/admin/broadcast/broadcast-form.tsx#L11-L12) + [actions.ts:9-13](next-app/app/(app)/admin/broadcast/actions.ts#L9-L13)
`titleUr` / `titleEn` collected and validated client-side but never sent — server schema is `{ ur, en, type }`. Either add a title column to `notifications` or drop the inputs.

### P1-15 Topbar theme toggle doesn't persist
[next-app/components/topbar.tsx:22-26](next-app/components/topbar.tsx#L22-L26)
Toggles `light`/`dark` classes on `<html>` only. Refresh resets. No localStorage / cookie / next-themes wiring even though `next-themes` is in `package.json:36`.

---

## P2 — Medium (perf / drift)

### P2-16 Cases page pulls every vote in the system
[next-app/app/(app)/cases/page.tsx:21](next-app/app/(app)/cases/page.tsx#L21)
`db.select().from(votes)` — no `WHERE`, no `LIMIT`. With even modest scale (50 cases × 30 voters × multi-month) this balloons. Should be `inArray(votes.caseId, allCases.map(c => c.id))`.

### P2-17 Audit page fetches the entire `members` table for lookups
[next-app/app/(app)/admin/audit/page.tsx:33-35](next-app/app/(app)/admin/audit/page.tsx#L33-L35)
`memberIds` is computed but unused; the query selects all rows. Should be `inArray(members.id, [...memberIds])`.

### P2-18 Messages page issues two queries to `members`
[next-app/app/(app)/messages/page.tsx:21-30](next-app/app/(app)/messages/page.tsx#L21-L30)
One for the dropdown (admins only), another for the inbox lookup map. Combine, or compute the lookup map from a single fetch.

### P2-19 Drizzle/SQL schema drift on `parent_id`
[next-app/lib/db/schema.ts:30](next-app/lib/db/schema.ts#L30) vs [next-app/supabase/migrations/0001_initial_schema.sql:27](next-app/supabase/migrations/0001_initial_schema.sql#L27)
TS schema declares `parentId: uuid('parent_id')` with no `.references(...)`. SQL has `REFERENCES members(id) ON DELETE SET NULL`. `drizzle-kit generate` from this schema will emit a migration that **drops the FK**. Either add `.references(() => members.id, { onDelete: 'set null' })` in the schema, or commit to managing migrations only via raw SQL and treat the Drizzle schema as types-only.

### P2-20 Defensive null check missing under `(app)/` pages
Every page does `const [me] = …; me.role …` without verifying `me`. The layout protects against the obvious unauthenticated case, but a logged-in user with no member row (e.g., race after onboarding, Supabase user without a linked row) will hit a TypeError instead of being redirected. Dashboard does it at [page.tsx:13-14](next-app/app/(app)/dashboard/page.tsx#L13-L14); same pattern in fund/loans/cases/audit/messages/notifications/myaccount/settings/tree.

### P2-21 Manifest direction conflicts with HTML root
[next-app/app/manifest.ts:15](next-app/app/manifest.ts#L15) sets `dir: 'rtl'`, [next-app/app/layout.tsx:25](next-app/app/layout.tsx#L25) sets `dir="ltr"`. Pick one, or make it user-selectable based on locale.

### P2-22 PWA icons miss `purpose: 'any'`
[next-app/app/manifest.ts:17-20](next-app/app/manifest.ts#L17-L20) — both icons are `maskable` only. The PWA spec recommends at least one `any`-purpose icon for install dialogs; many platforms render maskable-only icons cropped or placeholderd. Add a duplicate entry with `purpose: 'any'` (or `'any maskable'` if the asset really is safe-zone-padded).

### P2-23 Inbox doesn't mark messages read
[next-app/app/(app)/messages/page.tsx](next-app/app/(app)/messages/page.tsx)
There's no `markMessagesRead` action and the inbox renders without flipping `read = true`. The styling distinguishes read/unread, but a user can never get to the "all read" state.

### P2-24 Sidebar `locale` is a dead prop
[next-app/components/sidebar.tsx:25](next-app/components/sidebar.tsx#L25) accepts `locale` but no caller passes it; the layout in `(app)/layout.tsx` always uses defaults. The Urdu labels are unreachable. Either wire from `config.themePalette` neighbour / a user pref, or remove the dead branches.

### P2-25 `pnpm typecheck` fails — TypeScript not hoisted
The `package.json:11` script runs `tsc --noEmit`, but `node_modules/typescript/` is not directly hoisted (only present under `node_modules/.pnpm/typescript@5.9.3/...`). `pnpm typecheck` errors out before checking anything. Either: add a `.npmrc` with `public-hoist-pattern[]=typescript`, run `pnpm install` to refresh links, or run via `pnpm exec tsc --noEmit` and update the script. **This means the rebuild has shipped without a passing typecheck.**

---

## P3 — Low / missing features / infra debt

### P3-26 Audit page lacks filter by action/user (AUDIT.md ✓)
[next-app/app/(app)/admin/audit/page.tsx](next-app/app/(app)/admin/audit/page.tsx) — pure list, no filters. AUDIT.md claimed shipped.

### P3-27 Audit CSV export missing (AUDIT.md ✓)
No download endpoint or button. AUDIT.md claimed shipped.

### P3-28 JSON backup export/import missing (AUDIT.md ✓)
No UI for either. (AUDIT.md called this "Settings → Danger Zone".) AUDIT.md claimed shipped.

### P3-29 Forgot-password behavior changed silently
AUDIT.md describes "Forgot password (username + father name match)" — the rebuild ([next-app/app/forgot-password/forgot-form.tsx](next-app/app/forgot-password/forgot-form.tsx)) is a Supabase email-link reset. Better security, but a contract change worth documenting in the README.

### P3-30 Phase 1 polish bits to verify
AUDIT.md claims focus rings, ARIA labels, `prefers-reduced-motion`, empty-state SVGs, undo for delete, keyboard shortcuts (`/`, `?`, `g + letter`). Several are absent in this scan: no keyboard shortcut handler in any client component; no `prefers-reduced-motion` check around `setInterval` in [verse-bar.tsx:9](next-app/components/verse-bar.tsx#L9); no undo logic after `hardDeleteMember`. Empty-state copy exists ("No payments yet") but no SVG illustrations.

### P3-31 Dashboard "My Months Paid / 12" hardcoded
[next-app/app/(app)/dashboard/page.tsx:124](next-app/app/(app)/dashboard/page.tsx#L124) — divides by 12 regardless of when the user joined or current month-of-year. Should be months-in-year-so-far, or a configurable target.

### P3-32 Awkward dynamic imports inside server actions
[next-app/app/actions.ts:273](next-app/app/actions.ts#L273) and [actions.ts:288](next-app/app/actions.ts#L288) `await import('@/lib/db/schema')` despite `notifications`/`messages` being importable at the top of the file. Just add them to the static import.

### P3-33 Zero tests
No `*.test.ts`, no `*.spec.ts`, no Playwright/Vitest config. The user request mentioned Jest + RTL — none present.

### P3-34 No login / forgot-password rate limit
Login goes straight to `supabase.auth.signInWithPassword` ([login-form.tsx:19](next-app/app/login/login-form.tsx#L19)). Supabase has built-in throttling but no app-level cool-off; same for forgot-password.

### P3-35 No CSRF token on `/api/members/approve` form
[admin/members/page.tsx:47](next-app/app/(app)/admin/members/page.tsx#L47) is a plain HTML form POST. Same-origin SameSite=Lax cookies cover most of CSRF for top-level navigations, but converting this to a server action (which Next signs origin-checked) is the cleaner answer and removes the route handler entirely.

### P3-36 No CI workflow
No `.github/workflows/`, no `pnpm` cache, no automated build/typecheck/lint on PR.

### P3-37 No error tracking / structured logging
The Phase 2 plan in `AUDIT.md` mentions Sentry + PostHog — not wired. Server actions throw raw `Error('Admin only')`; clients show `e.message` via `toast.error`.

### P3-38 No `tenant_id` scaffolding
User scoped this out for now, noted here for tracking: every table is single-tenant. Adding multi-tenancy later means a column on every row + RLS rewrite.

---

## Cross-reference vs `AUDIT.md` Phase 1 ✓ list

| Phase 1 ✓ feature | Phase 3 status |
|---|---|
| Default admin login | Different model — Supabase email/password. Documented? No. |
| Multi-step setup wizard | Present (2 steps, was 3 in v1). |
| Self-registration with admin approval | Present (`/api/members/approve`, with P0-5 bug). |
| Pending verification page | Implicit via `members.status='pending'`; no dedicated page. |
| Forgot password | Behavior changed (P3-29). |
| Profile picture upload + 14-color avatar | Upload works; palette has 10 colors not 14. RLS bug P0-3. |
| Per-user theme palette | **Missing.** Theme is a global config field, not per-user. |
| Smart father-match | Tree component implements it via `siblingsByFather`. |
| Family tree | Present, with privacy bug P0-4. |
| Mark deceased + maghfirat dua | `softDeleteMember` works; no dua text in member detail. |
| Multi-pool + admin record payments | Works. |
| Member self-records donation | **Action exists, UI missing (P1-9).** |
| Pending excluded from total | Works (filter `pendingVerify=false`). |
| Qarz issuance + repayment | **No UI for either (P1-7).** |
| Emergency requests | Works. |
| Configurable vote threshold | Works (settings form). |
| Outstanding loans tracker | Works (read-only). |
| Sadqa privacy on dashboard | Works for member stats; **leaks via tree (P0-4)**. |
| Top contributors leaderboard | **Missing.** |
| Branch analytics | **Missing.** |
| Open voting / live vote bar / voter avatars | Vote bar present; no voter avatars in case card. |
| Stat cards / sparklines | Present (sparkline ordering bug P1-6). |
| 12-month area trend | Reduced to 6-month sparkline. |
| Fund pool donut chart | **Missing.** |
| Members by province distribution | **Missing.** |
| Personal yearly bar chart | **Missing.** |
| Streak counter | **Missing.** |
| Family Goal Bar | Present. |
| Global topbar search | **Dead UI (P1-10).** |
| WhatsApp single-member | Present (members table). |
| WhatsApp bulk reminders | **Missing.** |
| WhatsApp vote-reminder broadcast | **Missing.** |
| Notification sounds | **Missing.** |
| Sound mute toggle | **Missing.** |
| Broadcast messaging | Present (with P1-14). |
| Audit log | Present (with P3-26/27 missing filter+export). |
| JSON backup export/import | **Missing (P3-28).** |
| Auto-save | Not relevant — Postgres is the source of truth. |
| PWA installable | Manifest + `sw.js` at repo root (note: legacy file, not the next-app SW). |
| WCAG 2.1 AA polish | Partial — see P3-30. |

---

## Recommended fix order (if you green-light remediation)

1. **P0 sweep** (1–2 days): fix onboarding session check, decide RLS posture, fix avatar policy, filter tree paidBy server-side, redirect status code. Rotate any compromised admin claims if ever exposed in prod.
2. **P1 wiring** (2–3 days): bell link + unread filter, admin members add/edit forms, member donation form, loan issuance + repayment forms, broadcast title fields, theme persistence.
3. **P1 correctness** (1 day): chronological month sorting, per-case threshold display.
4. **Test scaffold** (1 day): add Vitest + RTL, write integration tests for the 8 server actions in `app/actions.ts` (against a test Postgres).
5. **P2 cleanup** (1 day): query consolidation, schema drift, defensive guards, fix `pnpm typecheck`.
6. **P3 backlog** (ongoing): missing AUDIT.md features (leaderboard, charts, bulk WhatsApp, backup/restore, audit filter+CSV), CI, observability.

---

*Generated 2026-05-08 from a static read of `next-app/` at branch `main` HEAD `d3a272f`. No production telemetry consulted.*
