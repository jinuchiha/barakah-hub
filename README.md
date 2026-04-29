# BalochSath · بلوچ ساتھ

**بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ**

*Khandan ka saath, har mushkil mein.*

Premium Islamic family fund + emergency support + governance dashboard. Ek hi HTML file. Koi setup nahi.

---

## Setup (pehli baar)

1. `index.html` par double-click
2. Welcome screen par naam + 4-digit PIN — admin profile ban jaye gi
3. Sidebar par tabs explore karein

## Bismillah aur Islamic content

- **Top par Bismillah** har page par
- **Verse banner** — har din ek alag Quranic verse Sadqa/charity ke baare mein (7 verses rotate)
- **Logo**: emerald + gold, crescent moon + handshake (family unity + Islamic identity)
- **Print statement** par bhi BalochSath logo + Bismillah

## Features

### 1. Login system (multi-profile, PIN-protected)
Har family member ka apna profile, 4-digit PIN, role.

### 2. Roles
| Role | Permissions |
|---|---|
| **Admin** | Sab kuch |
| **Fund Collector** | Contributions record karein |
| **Supervisor** | Contributions verify, disbursements |
| **Management Committee** | Cases pe vote, contributions verify |
| **Emergency Committee** | Emergency cases, voting |
| **Contributor** | Read-only, apni history |

### 3. Members (city REQUIRED)
- City field zaroori hai (city-wise WhatsApp groups, reports)
- **Admin approval required** for new members (toggle in Settings)
- Pending members admin ke pass approval queue mein
- Phone, monthly pledge, role

### 4. Contributions with **3-approval verification**
- Slip photo **REQUIRED** when method != Cash (bank transfer, JazzCash, Easypaisa, etc)
- Status flow: `recorded` → 3 verifiers approve → `verified`
- Until verified, doesn't count in balance
- Configurable approval count (default 3, per your proposal)
- Verifier can vote approve/reject with note

### 5. Cases — Gift OR Loan (Qarz-e-Hasna)
- **Gift / Sadqa**: wapas nahi karna
- **Qarz-e-Hasna (Loan)**: wapas karna hai, expected return date set kar sakte hain

Workflow:
1. Committee member case create karta hai (beneficiary, relation, city, category, amount, reason, supporting photos)
2. **2 approvals** mil jayein → APPROVED
3. Supervisor disburses (date, method, **receipt photo**)
4. **For Loan type:** repayments record kar sakte hain (amount, date, slip photo)
5. Outstanding amount auto-calculate, progress bar, overdue alerts

### 6. Loans tab (NEW)
- **Outstanding loans list** — kis ko kitna paisa baqi hai
- **Overdue loans** — due date past ho gayi to red flag, top par alert
- **Repayment recording** — slip ke saath
- **Progress bar** — kitna repaid, kitna outstanding
- Total outstanding number top par

### 7. Dashboard (premium)
- Hero greeting "Assalam o Alaikum, [name]"
- 4 KPI cards: Balance, This Month In, Outstanding Loans, Active Members
- 12-month trend chart (in vs out)
- Disbursement category donut
- **Top contributors leaderboard** (gold/silver/bronze)
- Pending dues with WhatsApp button
- Pending member approvals (admin only)
- Pending contribution verifications

### 8. Audit log (immutable)
Sab actions log: profile created, member added/approved/rejected, contribution recorded/verified, case created/voted/approved/disbursed/closed, repayments. Last 1000 entries. Admin-only.

### 9. Monthly Statement
- Premium printable design with logo, Bismillah, signature areas
- Year-wise table: members × months, totals, disbursements
- Disbursement detail with type (gift/loan), approvers
- Print/PDF se sath sath family group mein bhej dein

### 10. Hijri date
Header par har waqt Hijri (Umm al-Qura) + Gregorian.

### 11. WhatsApp share
Members tab pe har card pe green WhatsApp button — auto message generate hota hai with Islamic greeting, balance, dues.

### 12. Toasts
Har action pe slick notification (success/error).

## Roman Urdu mein quick guide

**Member add karna:**
Members tab → Add member → name + city (required) + phone + monthly pledge + role
Agar admin nahi ho, "Submit for approval" hoga, admin approve karega

**Contribution dena:**
Members card → "+ Contribution" ya direct Contributions tab
Member select → amount → date → method → agar bank transfer hai to slip photo
Save ke baad: "Awaiting verification" status, 3 logon ko verify karna hoga

**Verify karna:**
Dashboard pe "Contributions needing verification" panel ya Contributions tab > "Needs verification" sub-tab
Slip photo dekh sakte hain, approve ya reject vote dalein

**Case banana (emergency / qarz):**
Cases tab > New case
Type: Gift (wapas nahi) ya Loan (wapas)
Beneficiary, relation, category, amount, reason, supporting photos
2 approvals = APPROVED → supervisor disburses

**Loan repayment:**
Loans tab → outstanding loans → "+ Repayment" button → amount + slip photo
Progress bar update ho jayega

## Backup

**Settings > Export all data (JSON)** — har hafte zaroor karein.

## Stage 3 (jab fund grow ho jaye)

Multi-device live sync, real auth, cloud photo storage, realtime committee voting, public transparency URL, WhatsApp auto reminders — yeh sab Next.js + Supabase backend mein hoga. Bolein jab chahiye.

## File path

- `index.html` — full app (~3000 lines)
- `README.md` — yeh file
- Backups: `balochsath-YYYY-MM-DD.json`

---

**JazakAllah Khair.** Koi tweak chahiye to bata dein.

*"وَأَنفِقُوا۟ مِن مَّا رَزَقْنَـٰكُم"* — *And spend from what We have provided you* — Al-Munafiqun 63:10
