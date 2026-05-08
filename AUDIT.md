# Barakah Hub (Phase 1 predecessor) — Honest Internal Audit

> Historical document. The project has since been renamed from
> "Bait ul Maal BalochSath" to **Barakah Hub** and the active codebase
> moved to [`next-app/`](next-app/). The single-HTML predecessor remains
> at the repo root (`index.html`) as a frozen reference + data-import
> source. See [`next-app/AUDIT_PHASE3.md`](next-app/AUDIT_PHASE3.md) for
> the current audit.



**Date:** 7 May 2026
**File under audit:** `index.html` (4,238 lines) + `manifest.json` + `sw.js`
**Storage:** Browser `localStorage` (key: `balochsath_v8`)
**Latest commit:** `57a061f` (Phase 1 complete)

---

## ✅ What works today

### Identity & access
| Feature | Status |
|---|---|
| Default admin login (`abubakar` / `admin123`) | ✓ |
| Multi-step setup wizard (forced on first login) | ✓ |
| Self-registration with admin approval | ✓ |
| Pending verification page | ✓ |
| Forgot password (username + father name match) | ✓ |
| Profile picture upload + 14-color avatar | ✓ |
| Per-user theme palette (11 options) | ✓ |
| Role-based access (admin / member) | ✓ |

### Members & family
| Feature | Status |
|---|---|
| Father name compulsory in all add-member flows | ✓ |
| Smart father-match (auto-detects siblings) | ✓ |
| Family tree with father badges + sibling counters | ✓ |
| City + Province (8-province PK dropdown) | ✓ |
| Member self-add family (wife, kids) | ✓ |
| Mark deceased + maghfirat dua | ✓ |
| Edit own profile in Settings | ✓ |

### Money flow
| Feature | Status |
|---|---|
| Multi-pool: Sadaqah / Zakat / Qarz | ✓ |
| Admin records payments with month + note | ✓ |
| Member self-records donation → admin verifies | ✓ |
| Pending payments excluded from totalFund() | ✓ |
| Qarz-e-Hasana issuance + repayment | ✓ |
| Emergency requests with category-specific verses | ✓ |
| Configurable vote threshold (30–75%) | ✓ |
| Outstanding loans tracker | ✓ |

### Privacy (sadqa concept)
| Feature | Status |
|---|---|
| Non-admin dashboard hides other donors' names | ✓ |
| Non-admin sees only their own contributions | ✓ |
| Aggregate stats (count + total) for non-admin | ✓ |
| Top contributors leaderboard admin-only | ✓ |
| Branch analytics admin-only | ✓ |

### Voting
| Feature | Status |
|---|---|
| Open voting (all approved users) | ✓ |
| Configurable threshold | ✓ |
| Live vote bar + voter avatars | ✓ |
| Round-1/2 escalation REMOVED (was confusing) | ✓ |

### Visualization
| Feature | Status |
|---|---|
| Vibrant gradient stat cards + sparklines | ✓ |
| 12-month area trend (SVG) | ✓ |
| Fund pool donut chart | ✓ |
| Top contributors leaderboard with medals | ✓ |
| Members-by-province distribution | ✓ |
| Personal yearly bar chart | ✓ |
| 🔥 Streak counter | ✓ |
| Family Goal Bar with adaptive cheer | ✓ |

### Communication
| Feature | Status |
|---|---|
| Global topbar search (members/payments/cases/loans) | ✓ |
| WhatsApp single-member button | ✓ |
| WhatsApp bulk payment reminders | ✓ |
| WhatsApp vote-reminder broadcast | ✓ |
| Phone normalization (PK country code) | ✓ |
| Notification sounds (Web Audio) | ✓ |
| Sound mute toggle | ✓ |
| Broadcast messaging | ✓ |

### Compliance
| Feature | Status |
|---|---|
| Audit log (login, payment, vote, etc.) | ✓ |
| Audit filter by action + user | ✓ |
| Audit CSV export | ✓ |
| JSON backup export / import | ✓ |
| Auto-save every 5s + on page close | ✓ |

### Phase 1 polish (commit `57a061f`)
| Feature | Status |
|---|---|
| PWA installable (manifest + service worker) | ✓ |
| WCAG 2.1 AA: focus rings, ARIA labels, role=status toast | ✓ |
| `prefers-reduced-motion` honored | ✓ |
| Multi-step wizard with progress dots | ✓ |
| Empty-state SVG illustrations | ✓ |
| Undo for delete (member + payment) | ✓ |
| Keyboard shortcuts (`/`, `?`, `g + letter`) | ✓ |
| Family Goal Bar | ✓ |

---

## ⚠ Working but not great

| Issue | Reality |
|---|---|
| Color contrast for some inline `rgba(255,255,255,0.3)` text | Catch-all light-mode overrides handle it; can be cleaner with proper tokens |
| Tree rendering past 12 nodes | Gets cramped; needs pan/zoom or tree virtualization |
| Mobile drawer navigation | Sidebar hides but no replacement (just access via tabs) |
| `localStorage` capacity | ~5MB, can fill if many photos uploaded; no warning UI |
| Print statement | Removed in current version (was in older v6 backup) |

---

## ❌ Not done — needs Phase 2 (backend)

| Asked | Why not done in single HTML |
|---|---|
| Multi-device live sync | Needs Supabase / Firebase realtime |
| Real authentication (vs plaintext password in localStorage) | Needs auth backend |
| Cloud photo storage | localStorage caps at ~5MB total |
| Push notifications when offline | Needs Web Push + service worker push handler |
| Public transparency URL (read-only stats) | Needs hosted version |
| WhatsApp scheduled auto-reminders | Needs scheduled job (browser can't) |
| 1000+ user scale | localStorage architecture won't scale past ~100 users |
| Audit log immutability | Currently in-memory + localStorage — admin can clear |

---

## 🎯 Honest recommendation

**The single-HTML approach has crested.** Every feature from the published roadmap is shipped. The remaining gaps are all backend-shaped:

1. **Multi-device sync** — no path forward without Supabase/Firebase
2. **Real authentication** — plaintext passwords are a ticking liability
3. **Cloud photo storage** — every uploaded photo eats `localStorage` budget
4. **Scheduled WhatsApp** — browser can't run a cron job
5. **True audit immutability** — admin can `dangerClearAll()` today

### Phase 2 plan (24 hours of focused work)
- Supabase project: Postgres + Auth + Storage + Realtime
- Migration script: localStorage JSON → Supabase rows
- Replace plaintext `pass` field with Supabase Auth
- Live sync via Supabase channels
- Photos move to Supabase Storage with signed URLs
- Add Sentry for error reporting + PostHog for usage analytics

### Phase 3 plan (1 month)
The React/Tailwind/Next.js rewrite documented in the strategic analysis. Honors the original "MERN/PERN" stack request.

---

## File map

```
barakah-hub/  (legacy file map — Phase 1 single-HTML predecessor)
├── index.html          # full app — 4,238 lines
├── manifest.json       # PWA manifest
├── sw.js               # service worker (offline shell cache)
├── README.md           # user-facing docs
├── AUDIT.md            # this file
├── .gitignore
└── images/
    └── logo.png.png    # reference logo (rendered as SVG inline)
```

---

## Backup discipline

**Weekly minimum:** Settings → Danger Zone → ⬇ Export. Save JSON to Drive/Dropbox/Email-to-self.

If anything goes wrong (localStorage cleared, browser uninstalled, device lost) — drop the JSON back via ⬆ Import. Full restore.

---

*Audit produced from clean static analysis of `index.html` @ `57a061f`. No production telemetry.*
