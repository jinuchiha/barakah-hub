# Runbook — what to do when something goes wrong

This is for whoever is holding the pager at 2am, technical or not. It
assumes no developer is immediately reachable. Read [`DEPLOY.md`](DEPLOY.md)
for how the app is *deployed*; this file is for what to do once it's
already live and something breaks.

## What actually protects the data today

1. **Neon Point-in-Time Recovery (PITR)** — the real safety net. Neon
   keeps a continuous history of every write for the plan's retention
   window (check the current plan in the Neon console — free tier is
   shorter than paid). This means the database can be rolled back to
   *any second* in that window, not just a nightly snapshot.
2. **Weekly backup email** (`/api/cron/weekly-backup`, Sundays 2am) — a
   human-readable CSV summary + row counts emailed to the admin, plus an
   automatic reconcile that catches (and self-heals) two known drift
   patterns: `loans.paid` disagreeing with `SUM(repayments)`, and a
   disbursed qarz case with no matching loan row. This is a **sanity
   check**, not a restorable backup by itself — the restore mechanism is
   always Neon PITR (#1).
3. **Append-only audit log** — every money-moving action writes a row
   that cannot be edited or deleted, enforced by a database trigger
   (migration `0002`), not just app code. If numbers ever look wrong,
   the audit log is the source of truth for reconstructing what
   actually happened, even if a bug corrupted a later read.

## "The app is down" (nobody can log in / white screen / 500s)

1. Check **Vercel → Deployments** for the project. If the latest deploy
   shows a red X, click into it and read the build log — the fix is
   usually reverting the last merged PR (`git revert`, push to `main`).
2. If deploys are all green but the site still errors, check
   **Vercel → Runtime Logs** for the actual error, and separately check
   the **Neon console** — if the database branch is suspended (idle
   compute auto-suspend on some plans) it wakes on the next request
   within a few seconds; if it shows an error state, that's the thing to
   escalate to Neon support.
3. As a last resort, **Vercel → Deployments → (last known-good) → Promote
   to Production** rolls back instantly without touching git history.

## "A payment/loan number looks wrong"

1. Don't hand-edit the database. Open **Admin → Audit Log** and filter
   by the member or the approximate time — every state change (record,
   supervisor-approve, verify, reject, repay) is there with who did it
   and when.
2. If the ledger and the audit log genuinely disagree (not just a
   misunderstanding of the two-person flow), that's a real bug —
   preserve the audit log query results (screenshot or export) before
   anyone touches the row, then get a developer involved.
3. The weekly reconcile job (above) already catches the two most likely
   drift patterns automatically — check this week's backup email first;
   the mismatch may already be identified and healed.

## "I need to restore lost/corrupted data"

1. This is a **Neon PITR** operation, not something done inside the app.
   In the Neon console: select the project → **Branches** → create a
   new branch **from a specific point in time** (before the bad write).
2. Verify the restored branch looks correct (spot-check the affected
   member's payments/loans against what people remember actually
   happening).
3. Only once verified: point `DATABASE_URL` / `DATABASE_URL_DIRECT` in
   Vercel's environment variables at the restored branch's connection
   string, then redeploy. This is a deliberate, reversible cutover —
   the old (bad) branch still exists and isn't deleted.
4. This is a rare, high-stakes action. If in doubt, contact Neon
   support before cutting over — they can advise on the safest sequence
   for your specific plan.

## "A member can't sign in" / "OTP never arrived"

This is almost always the known Resend-sandbox limitation, not a bug:
without a verified sending domain, transactional email only delivers to
the Resend account's own address. Fix path:

- **Immediate**: Admin → Members → **Verify email**, type the member's
  email, submit. This manually clears the block after you've confirmed
  their identity some other way (phone call, in person).
- **Permanent**: buy/verify a sending domain in Resend, set `RESEND_FROM`
  to an address on that domain in Vercel's environment variables. Email
  then reaches everyone automatically going forward.

## "WhatsApp / email notifications stopped going out"

Both integrations are designed to **fail silently and never block a
money action** — a payment still verifies correctly even if the receipt
email fails to send. Check:

- **Resend**: dashboard shows delivery status per email; a spike in
  bounces usually means the domain's DNS records need re-verifying.
- **WhatsApp (Meta Cloud API)**: the access token is short-lived unless
  a permanent System User token was generated (see the WhatsApp setup
  notes) — an expired token is the most common cause of a sudden outage.
  Regenerate it in Meta Business settings and update
  `WHATSAPP_ACCESS_TOKEN` in Vercel.

## Escalation contacts by system

| System | What it's for | Where to go |
|---|---|---|
| Neon | Database, backups, PITR restore | console.neon.tech → Support |
| Vercel | Hosting, deploys, cron jobs, env vars | vercel.com → project → Support |
| Resend | Transactional email delivery | resend.com/docs → Support |
| Meta Business | WhatsApp Cloud API | business.facebook.com/support |
| Application bugs | Anything not covered above | The developer who last worked on this repo |

---

## Database privilege separation (OUTSTANDING — not yet done)

**Status: open.** The audit-log immutability guarantee is only partial until
this is finished, and no code change can complete it — it is an infrastructure
task.

**What is protected now.** `audit_log` has three triggers that block tampering
from the normal query path: `BEFORE UPDATE` and `BEFORE DELETE` (migration
0002, row-level) and `BEFORE TRUNCATE` (migration 0017, statement-level — row
triggers do not fire on TRUNCATE, which was an open hole).

**What is still exposed.** The application connects with `DATABASE_URL` as
`neondb_owner`, which *owns* `audit_log`. An owner can:

```sql
DROP TRIGGER audit_log_block_delete ON audit_log;   -- then DELETE freely
ALTER TABLE audit_log DISABLE TRIGGER ALL;
DROP TABLE audit_log;
```

So the trail is protected against application bugs and accidents, **not**
against anyone holding the production connection string. Do not describe it as
tamper-proof until the steps below are done.

**To close it:**

1. Create a runtime role with DML but no DDL, and no TRUNCATE on `audit_log`:
   ```sql
   CREATE ROLE barakah_app LOGIN PASSWORD '<generated>';
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO barakah_app;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO barakah_app;
   REVOKE TRUNCATE ON audit_log FROM barakah_app;
   REVOKE UPDATE, DELETE ON audit_log FROM barakah_app;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public
     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO barakah_app;
   ```
2. Point `DATABASE_URL` at `barakah_app`. Leave `DATABASE_URL_DIRECT` on the
   owner — migrations legitimately need DDL.

**Read this before you do it — there is a trap.** Migration 0001 runs
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on ten tables, but every policy it
tried to create referenced Supabase-only objects (`auth.uid()`, the
`authenticated` role) and was skipped by the migration runner. RLS is
therefore **enabled with zero policies**. The table owner bypasses RLS, which
is why the app works today. The moment you introduce a non-owner role, RLS
starts denying *everything* and the app goes down hard.

So step 1 must be paired with a decision, in the same change:

- **Either** write real policies for `barakah_app`,
- **or** `ALTER TABLE <t> DISABLE ROW LEVEL SECURITY` on those ten tables and
  rely on the application-layer gate in `lib/auth-server.ts` (`requireRole`),
  which is what actually enforces authorization today.

Rehearse on a Neon branch before touching production.

**Beyond that**, a genuinely tamper-evident trail needs an append-only sink
outside this database (object storage with object-lock, or a managed log
service). Nothing inside a database an operator controls can prove it was not
edited by that operator.

---

## "Notifications stopped arriving" (the outbox)

Delivery is now a queue, not a side effect, so this is answerable instead of
guesswork. Everything below is a query, not a hunch.

**1 · Ask the app first.**

```bash
curl -s "$APP_URL/api/health?deep=1" | jq .notifications
# { "pending": 3, "sent": 1420, "dead": 2, "oldestPendingMinutes": 4 }
```

- `dead > 0` — messages that will never send without a change. **This is the
  usual answer.** See step 2.
- `oldestPendingMinutes > 60` — the drain has stopped. The cron runs every 5
  minutes, so an hour-old backlog means `/api/cron/outbox` is not running:
  check `CRON_SECRET` is set and look at the Vercel cron logs.
- All zero and members still report nothing — the message was never queued.
  Check the action actually calls `enqueue()`.

**2 · Read why they died.**

```sql
SELECT channel, kind, count(*), max(last_error) AS example
FROM outbox_messages WHERE state = 'dead'
GROUP BY channel, kind ORDER BY count(*) DESC;
```

The two causes you will actually see:

| `last_error` contains | Fix |
|---|---|
| `outside the 24-hour window` | Set the named `WHATSAPP_TEMPLATE_*` env var to an approved template. Meta rejects business-initiated free text; no amount of retrying changes that. |
| `RESEND_API_KEY not configured` | Set it. Messages stay queued rather than being lost, so they deliver once it is set. |
| `Member has no phone/email` | Nothing to fix in the app — the member has no address on file. |

**3 · Requeue after fixing the cause.**

```sql
-- Re-arm dead messages once the env var / key is in place.
UPDATE outbox_messages
SET state = 'pending', attempts = 0, next_attempt_at = now(), last_error = NULL
WHERE state = 'dead' AND channel = 'whatsapp';
```

The next cron run picks them up. Dedupe keys mean this cannot double-send
anything that already went out.

---

## "Where did this number come from?" (the ledger)

The fund balance is `SUM(amount)` over `ledger_entries`, one signed row per
movement. It is append-only — corrections are reversals, never edits.

```sql
-- Current position per pool.
SELECT pool, SUM(amount)::int AS available FROM ledger_entries GROUP BY pool;

-- Everything that moved a pool, newest first.
SELECT occurred_on, source_type, amount, detail
FROM ledger_entries WHERE pool = 'sadaqah' ORDER BY occurred_on DESC LIMIT 50;

-- Does the ledger agree with the payment records?
SELECT
  (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status = 'verified') AS verified_payments,
  (SELECT COALESCE(SUM(amount),0) FROM ledger_entries WHERE source_type = 'payment') AS ledger_credits;
```

Those two figures should match. If they do not, a verification committed
without its ledger entry — which the transaction wrapping is meant to make
impossible, so treat a mismatch as a real incident and check the
`ledger-reconcile-mismatch` audit rows.

Note `available` can legitimately be **negative** for `qarz`: lending more
than has been repaid is the normal state of a loan fund.

---

## Tracing one request

Every request carries `x-request-id`, stamped by middleware and returned on
the response. Ask the user for it, then search the Vercel logs for that
value: every log line for that request is JSON carrying the same id, plus
`event`, `actorId` and `durationMs`.

```
requestId:"<id>"                 all lines for one request
event:"api.internal_error"       masked 500s, with the real error
outcome:"error"                  failed timed operations
```
