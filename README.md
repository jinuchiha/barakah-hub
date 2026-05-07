# Bait ul Maal BalochSath · بیت المال بلوچ ساتھ

**بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ**

> *Khandan ka saath, har mushkil mein.*
> Premium Islamic family fund — sadqa, qarz-e-hasana, emergency vote, full audit trail.
> Single HTML file. No build. No backend. Works offline as a PWA.

**Live commit:** [`57a061f`](https://github.com/jinuchiha/balochsath/commit/57a061f) on `main`

---

## Quick start

```bash
# Just open it
open index.html      # macOS
start index.html     # Windows
xdg-open index.html  # Linux
```

**Default admin login:** `abubakar` / `admin123` → first-login wizard forces real details + new password.

To install as an app: open in Chrome/Edge → click the `⤓ Install App` button bottom-left, or use browser menu → "Install app".

---

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire app (~4,200 lines: HTML + CSS + vanilla JS) |
| `manifest.json` | PWA manifest (icons, name, theme color) |
| `sw.js` | Service worker (offline + stale-while-revalidate cache) |
| `AUDIT.md` | Honest internal audit |
| `images/` | Logo and reference assets |

---

## Features (current)

### Identity & access
- ✅ First-time setup wizard (3 steps: Identity → Contact → Security)
- ✅ Forgot password flow (username + father's name security check)
- ✅ Pending verification page for new registrations
- ✅ Per-user profile photo upload + 14-color avatar picker
- ✅ Roles: admin (full) / member (own data + voting)

### Family & relationships
- ✅ Family tree with father-name badges, sibling counters, location pins
- ✅ Smart father-match — typing father's name detects existing siblings
- ✅ City + Province + 8-province dropdown (Balochistan, Sindh, Punjab, KPK, GB, AJK, Islamabad, Overseas)
- ✅ Member self-add family (wife, kids) without admin involvement
- ✅ Mandatory father name on every member

### Money flow
- ✅ Multi-pool fund: Sadaqah / Zakat / Qarz pool (Q.9:60 compliance)
- ✅ Member self-records donation → admin verifies → counts in fund
- ✅ Qarz-e-Hasana issuance + repayment tracking
- ✅ Emergency requests with category-specific verses + voting
- ✅ Configurable vote threshold (30–75%) — admin sets

### Sadqa privacy (the moat)
- ✅ Non-admin dashboard hides ALL other donors' names + amounts
- ✅ Each donor sees only their own contributions
- ✅ Aggregate "12 contributions this month, total Rs. X" — no individual breakdown
- ✅ "انفرادی نام و رقم خفیہ ہے" — true spirit of sadqa

### Visualization
- ✅ Vibrant gradient stat cards with inline SVG sparklines
- ✅ 12-month area trend chart
- ✅ Fund pool donut chart
- ✅ Top contributors leaderboard (admin only)
- ✅ Members-by-province distribution
- ✅ Personal yearly bar chart on My Account
- ✅ 🔥 Streak counter (consecutive months paid)

### Theme & UX
- ✅ 11 refined color palettes (Royal Gold, Emerald, Sapphire, Ruby, Amethyst, Bronze, Forest, Midnight, Copper, Graphite, Charcoal)
- ✅ Dark + Light mode (fully readable in both)
- ✅ Bilingual UI (Urdu RTL + English LTR via single class toggle)
- ✅ Hijri date in header
- ✅ Verse banner ticker with bilingual translations
- ✅ Empty-state SVG illustrations
- ✅ Multi-step wizard with progress dots

### Communication
- ✅ Global topbar search (members / payments / cases / loans)
- ✅ WhatsApp integration:
  - Per-member 📱 button → payment reminder
  - Bulk reminders (all unpaid members at once)
  - Vote reminders (broadcast to non-voters)
  - Auto Pakistan country-code normalization (`03xx` → `+923xx`)
- ✅ Notification sounds (Web Audio API — no asset files)
- ✅ Broadcast messaging
- ✅ Notifications inbox per user
- ✅ Family Goal Bar with adaptive cheer text

### Compliance & trust
- ✅ Audit Log — every action recorded (login, payment, vote, password reset, etc.)
- ✅ Audit log filterable by action + user, exportable to CSV
- ✅ JSON backup export / import (Settings → Danger Zone)
- ✅ Configurable auto-save (every 5 seconds + on page close)

### Accessibility (WCAG 2.1)
- ✅ Universal `:focus-visible` rings
- ✅ Toast announced via `role="status" aria-live="polite"`
- ✅ `prefers-reduced-motion` honored
- ✅ Semantic buttons with `aria-label`

### Power user
- ✅ Keyboard shortcuts (`/` search, `?` help, `g` then letter for navigation)
- ✅ PWA installable, offline-capable

---

## Roadmap

### Phase 1 — Polish ✅ **DONE** (commit `57a061f`)
PWA, WCAG AA, Goal Bar, Multi-step Wizard, Empty states, Undo, Keyboard shortcuts.

### Phase 2 — Sync & Trust (pending)
Backend introduction, ~24 hours work:
- Supabase auth (replace plaintext localStorage passwords)
- Postgres for relational family data
- Multi-device live sync via Supabase Realtime
- Cloud photo storage
- Sentry error tracking + PostHog analytics

### Phase 3 — Modern Rebuild (pending)
The React/MERN/PERN stack rewrite, ~1 month:
- Next.js 16 App Router + Tailwind v4 + shadcn/ui
- TanStack Query (server state) + Zustand (client state)
- Postgres on Supabase (PERN preferred over MERN for relational fit)
- NextAuth.js with magic-link
- Expo wrapper for native mobile
- Vitest + Playwright + Sentry + PostHog

---

## Backup discipline

**Every week:** Settings → Danger Zone → ⬇ Export → save the JSON to Drive/Dropbox.

If localStorage is wiped, drop that JSON back in via ⬆ Import — full state restored.

---

## Default credentials (clean install)

| Username | Password | Role |
|---|---|---|
| `abubakar` | `admin123` | Admin |

First login forces wizard: name, father, phone, city, province, new password. The default password is then deactivated.

---

## License

Closed family-internal use. Not for redistribution.

---

**JazakAllah Khair.**

> *وَأَنفِقُوا۟ مِن مَّا رَزَقْنَـٰكُم* — *And spend from what We have provided you* — Al-Munafiqun 63:10
