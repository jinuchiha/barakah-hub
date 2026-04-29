# BalochSath — Honest Audit

Date: 2026-04-29
File: `index.html` (1286 lines)
Storage: Browser localStorage only

---

## ✅ What's actually working

| Feature | Status | Notes |
|---|---|---|
| Multi-profile login (PIN) | ✓ | SHA-256 hashed, 4-digit PIN |
| Roles (admin/collector/supervisor/committee/contributor) | ✓ | 6 roles total |
| Members with city, phone, monthly pledge | ✓ | City required |
| 2-admin approval for new members | ✓ | Configurable |
| Contributions with slip photo upload | ✓ | Required for non-cash methods |
| 2-verifier approval for contributions | ✓ | Configurable |
| Cases (gift / loan) with reason + docs | ✓ | Photo support |
| **Majority-of-members voting on cases** | ✓ | Just changed: `ceil(active/2)` |
| Loan tracking with repayments | ✓ | Outstanding amount, overdue alerts |
| Hijri date display | ✓ | Header + dates |
| Audit log | ✓ | Last 1000 entries |
| Annual statement (printable) | ✓ | Year × members table |
| Monthly chart | ✓ | 12-month trend |
| Top contributors leaderboard | ✓ | Dashboard panel |
| Pending dues with WhatsApp share | ✓ | Auto-message generated |
| Backup / Restore JSON | ✓ | Settings → Export/Import |
| Zakat calculator | ✓ | Top bar button |
| Dark mode toggle | ✓ | Sidebar bottom |
| EN / Urdu language toggle | ✓ | Top bar |
| Du'a popup on contribution | ✓ | 12 random Arabic + Urdu + ref |
| Verse banner ticker (180s) | ✓ | 12 hadiths/verses scrolling |
| Sadaqah Rewards card with multipliers | ✓ | Daily wisdom on dashboard |
| Household + Sarbrah concept | ✓ | Just added |
| Logo image reference | ✓ | `images/logo.png.png` |

## ⚠ Working but not polished

| Issue | Reality |
|---|---|
| **UI premium-ness** | Functional, NOT top-tier. Tailwind via CDN limits design ceiling. |
| **Logo styling** | Image displayed raw — no frame, glow, halo, animation |
| **EN mode** | Some labels still have Urdu mixed in (incomplete cleanup) |
| **Color scheme** | Migrated through 5+ palettes, accumulated debt |
| **Typography hierarchy** | Decent but not Linear/Stripe-grade |
| **Animations** | Basic transitions only, no Framer Motion-quality motion |
| **Empty states** | Most are generic ("No data") not designed |
| **Mobile UX** | Functional drawer + tabs, but not truly mobile-first |

## ❌ Asked but NOT done (limitations of single HTML)

| Asked | Why not done |
|---|---|
| **Multi-device live sync** | Needs backend (Supabase). Single HTML = browser-only. |
| **Real authentication** | PIN is honor-system, not bank-grade. |
| **Cloud photo storage** | Photos are base64 in localStorage. ~10MB total cap. |
| **Realtime committee voting** | No websockets. Need backend. |
| **Public transparency URL** | Need hosted version. Drag-drop to Vercel works for read-only. |
| **WhatsApp auto-reminders** | Need scheduled job. Browser can't do that. |
| **Production-grade UI** | Single HTML + CDN Tailwind has visual ceiling. |

## 🎯 Honest recommendation

This single-HTML approach has hit its ceiling. Every iteration adds features but the foundation can't deliver:
- Stripe/Linear-tier polish
- True multi-device sync
- Real production deployment

**Stage 3 (proper rebuild) needs:**
- **Frontend**: Next.js 16 + shadcn/ui + Framer Motion (for animations)
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime)
- **Hosting**: Vercel (frontend) + Supabase (free tier) — both free
- **Time**: 8-12 hours of focused build
- **Result**: Real auth, multi-device live sync, cloud photos, realtime voting, public transparency URL, mobile-native feel

**To proceed**: bolein "Stage 3 banao" — main start it.

Until then, this single HTML is a working prototype suitable for:
- Single-device family use (one treasurer manages it)
- Sharing via PDF print (monthly statements)
- Backup via JSON export weekly
- WhatsApp screenshots for transparency
