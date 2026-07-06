# Migrating from Supabase to Neon — technical roadmap

> Comprehensive playbook for moving Barakah Hub's Postgres layer from
> Supabase to Neon. Written for the **current stack** — Next.js 16 +
> Drizzle ORM + Cloudflare Workers (OpenNext) + Supabase Auth + Supabase
> Storage. The gaps Neon doesn't fill are called out explicitly.

---

## TL;DR

**What you get with Neon**
- Serverless Postgres with autoscaling-to-zero (free tier covers our scale).
- **Database branching** — one DB branch per PR, copy-on-write, instant.
- HTTP-based driver (`@neondatabase/serverless`) — natively compatible with
  Cloudflare Workers, no TCP-pooling gymnastics.
- Read replicas + IP allow-listing on the paid tier.

**What Neon doesn't replace**
| Supabase service | Neon equivalent | Replacement options |
|---|---|---|
| Postgres | ✓ Postgres | n/a — Neon is a drop-in |
| Auth (`auth.users`, JWT, magic-link) | ✗ | Auth.js / Better-Auth / Clerk / Lucia / WorkOS |
| Storage (S3-compatible buckets) | ✗ | Cloudflare R2 / AWS S3 / UploadThing |
| Realtime (`LISTEN/NOTIFY` over WebSocket) | partial — Neon has logical replication, no WS | Pusher / Ably / Liveblocks / SSE roll-your-own |
| RLS policies | ✓ Postgres RLS works the same | n/a — but our app currently bypasses RLS via direct connection |
| Edge Functions | ✗ | Cloudflare Workers (we already use them) |

**Net effect:** moving to Neon means **3 separate vendor relationships**
(Neon for DB, an auth provider, an object store) **vs 1 today** (Supabase).
Migration risk is ~2 weeks for a careful phased rollout.

**When to commit**:
- You hit a Supabase pricing wall (unlikely at family scale).
- You need branch-per-PR DB workflows that Supabase doesn't natively offer.
- You want autoscale-to-zero billing (Supabase always-on free tier already covers us).
- You're standardising your fleet on Neon for unrelated reasons.

If none of those apply: stay on Supabase. The audit posture in
[`AUDIT_PHASE3.md`](../AUDIT_PHASE3.md) is Supabase-shaped and the
migration cost outweighs the benefit at our scale.

---

## Phase 0 — Decisions before code touches

Lock these before Phase 1.

### 0.1 — Auth provider

This is the biggest call. Pick one and stick.

| Option | Effort | Trade-off |
|---|---|---|
| **Auth.js (NextAuth) v5** | medium | Open-source, free, Drizzle adapter ships with it. Feels home-grown. |
| **Better-Auth** | low | Modern Auth.js alternative. TypeScript-first. Active development as of late 2025. |
| **Clerk** | low | Hosted. Free up to 10K MAU. Best DX. Vendor lock-in. |
| **Lucia** | low | Library, not a service. You own the schema + sessions. Most code to maintain. |
| **WorkOS / Stytch** | medium | Enterprise SSO, audit, magic-link. Free tiers exist; paid quickly. |

**Recommendation for Barakah Hub:** **Better-Auth + Drizzle adapter**.
- Open-source, Drizzle-native, no vendor lock.
- Migrating user records from Supabase `auth.users` to a local `users` table is straightforward.
- Family-scale traffic (sub-1K MAU) means we never approach Clerk's free tier ceiling, but we also don't *need* Clerk's polish.

### 0.2 — Object storage provider

We use Supabase Storage for avatars (per-user folder, scoped by `auth.uid()` after migration 0002).

| Option | Trade-off |
|---|---|
| **Cloudflare R2** | Same vendor as our Workers deployment. Zero egress fees. S3-compatible API. |
| **AWS S3** | Mature, but egress is pricey and you're cross-vendor. |
| **UploadThing** | Hosted, Next.js-native; great DX, less control. |
| **Bunny.net Storage** | Cheapest egress; less polished SDK. |

**Recommendation:** **Cloudflare R2**. Same dashboard as the Worker we
already deploy to; zero egress; S3-compatible so the migration from
Supabase Storage is just a path-and-credentials swap.

### 0.3 — Realtime

Today: we don't use Supabase Realtime. The audit + Phase 3 work doesn't
emit any subscriptions. **No replacement needed** unless future features
demand it. If they do, Pusher Channels or Liveblocks are the standard
picks.

### 0.4 — Driver choice (this matters more than it sounds)

| Driver | Use when | Why |
|---|---|---|
| `drizzle-orm/neon-http` + `@neondatabase/serverless` | Cloudflare Workers, serverless functions, edge runtimes | HTTP-based, fetch-native, no TCP socket needed. Single round-trip per query. |
| `drizzle-orm/neon-serverless` + `@neondatabase/serverless` | Long-lived Node.js processes that need transactions or `LISTEN/NOTIFY` | WebSocket-backed; supports multi-statement transactions. |
| `drizzle-orm/postgres-js` + `postgres` | Generic Node.js (current Supabase setup) | Battle-tested, but TCP — extra socket setup on Workers. |

**Recommendation:** `drizzle-orm/neon-http` for our Workers deployment.
HTTP-only means no `nodejs_compat` dependency for the DB layer (we still
need it for other things), and queries are stateless — every Worker
invocation gets a fresh fetch with no cold-start TCP handshake.

**Caveat:** `neon-http` doesn't support multi-statement transactions in a
single round-trip. For the four places we use them (cast vote, record
repayment, approve member, broadcast notification) we either:
1. Move them to Neon Functions (not yet available), or
2. Use `neon-serverless` for those specific actions, or
3. Refactor them as compensating actions (idempotent retry-safe writes).

For Barakah Hub: the transactional writes are small enough that
compensating-action refactors are cleaner than a dual driver.

---

## Phase 1 — Set up Neon

### 1.1 — Create the project

```bash
# Install the CLI
npm i -g neonctl

# One-off OAuth login (opens browser)
neonctl auth

# Create a project named "barakah-hub" in the closest region.
# Pick the region nearest your users; we use ap-southeast-1 here.
neonctl projects create --name barakah-hub --region-id aws-ap-southeast-1
```

Output gives you the **project ID** + the **default branch URI**.
Save both.

### 1.2 — Create the branches

Neon's branching model: every branch is a copy-on-write snapshot of its
parent. Branches are free up to a quota.

```bash
# `main` exists by default. Create production + dev branches:
neonctl branches create --name production --parent main
neonctl branches create --name dev        --parent main

# Result: three branches.
neonctl branches list
```

Convention used below:
- `main` — pristine schema-only branch (acts as the "template")
- `production` — live data, attached to deployed Worker
- `dev` — your local shell + local migrations apply here first
- `pr-<number>` — created per pull request, deleted on merge

### 1.3 — Get the connection strings

```bash
neonctl connection-string production --pooled
# → postgresql://barakah_owner:<password>@ep-xxx-pooler.aws-ap-southeast-1.neon.tech/neondb?sslmode=require

neonctl connection-string production
# → postgresql://barakah_owner:<password>@ep-xxx.aws-ap-southeast-1.neon.tech/neondb?sslmode=require
```

The **`-pooler` host** is the PgBouncer-fronted pooled endpoint. Use it
for most app traffic. The **direct host** (no `-pooler`) is needed for
schema migrations because PgBouncer transaction mode doesn't support
prepared statements that Drizzle migrations issue.

Two env vars to set:
```env
DATABASE_URL=postgresql://...@ep-xxx-pooler.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_DIRECT=postgresql://...@ep-xxx.aws.neon.tech/neondb?sslmode=require
```

---

## Phase 2 — Export schema + data from Supabase

### 2.1 — Schema-only dump

```bash
# Set the Supabase direct (non-pooler) connection string locally
export SUPABASE_DB_URL='postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require'

# Dump only schema, exclude Supabase-managed schemas
pg_dump "$SUPABASE_DB_URL" \
  --schema-only \
  --no-owner --no-privileges \
  --schema=public \
  -f schema-from-supabase.sql
```

Exclude these Supabase-internal schemas from the dump if `pg_dump`
includes them: `auth`, `storage`, `realtime`, `extensions`, `graphql`,
`graphql_public`, `pgsodium`, `pgsodium_masks`, `vault`, `_analytics`,
`_realtime`, `_supavisor`, `pgbouncer`. The `--schema=public` flag above
already restricts to public so this is usually unnecessary.

### 2.2 — Strip Supabase-specific bits

Open `schema-from-supabase.sql` and remove:

```sql
-- Remove these — they reference Supabase internals
GRANT ... TO supabase_admin;
GRANT ... TO authenticated;
GRANT ... TO anon;
GRANT ... TO service_role;

-- Remove RLS policy declarations that reference auth.uid() helpers
-- (we'll re-create them after auth migration in Phase 5; for now app
--  layer enforces auth like it does today)

-- Remove storage bucket SQL (handled by storage provider, not Postgres)
```

### 2.3 — Apply schema to Neon main branch

```bash
psql "$(neonctl connection-string main)" -f schema-from-supabase.sql
```

Verify tables exist:

```bash
psql "$(neonctl connection-string main)" -c '\dt'
```

You should see: `members`, `payments`, `cases`, `votes`, `loans`,
`repayments`, `notifications`, `messages`, `audit_log`, `config`.

### 2.4 — Data dump + load

```bash
# Data only — column data, no schema
pg_dump "$SUPABASE_DB_URL" \
  --data-only \
  --schema=public \
  --column-inserts \
  -f data-from-supabase.sql

# Apply to Neon production branch (NOT main; main stays schema-only)
psql "$(neonctl connection-string production)" -f data-from-supabase.sql
```

`--column-inserts` is slower but produces `INSERT INTO ... (col, ...) VALUES`
statements that are robust to column-order drift.

### 2.5 — Validate

Spot-check row counts:

```bash
for tbl in members payments cases votes loans notifications audit_log; do
  src=$(psql "$SUPABASE_DB_URL" -tAc "SELECT count(*) FROM $tbl;")
  dst=$(psql "$(neonctl connection-string production)" -tAc "SELECT count(*) FROM $tbl;")
  printf "%-15s src=%-6s dst=%-6s %s\n" "$tbl" "$src" "$dst" \
    "$([ "$src" = "$dst" ] && echo OK || echo DRIFT)"
done
```

Any DRIFT line is a bug — investigate before flipping reads.

---

## Phase 3 — Application code changes

### 3.1 — Install Neon driver, swap Drizzle dialect

```bash
pnpm remove postgres                              # the postgres-js driver
pnpm add @neondatabase/serverless drizzle-orm     # serverless driver + ORM
```

### 3.2 — Update `lib/db/index.ts`

**Before** (current Supabase + postgres-js):

```ts
// lib/db/index.ts — current
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 10 });
export const db = drizzle(client, { schema });
```

**After** (Neon HTTP driver, Workers-compatible):

```ts
// lib/db/index.ts — Neon HTTP
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('[db] DATABASE_URL not set');
}

// Reuse the SQL client across hot reloads in dev
const globalForDb = globalThis as unknown as {
  neonClient: ReturnType<typeof neon> | undefined;
};

const sql = globalForDb.neonClient ?? neon(connectionString!);
if (process.env.NODE_ENV !== 'production') globalForDb.neonClient = sql;

export const db = drizzle(sql, { schema });
export { schema };
```

### 3.3 — Update Drizzle Kit config

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Migrations use the DIRECT connection (no pooler) — drizzle-kit
    // issues prepared statements and DDL that PgBouncer transaction
    // mode rejects.
    url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!,
  },
  // Helps Drizzle Kit understand Neon's specific Postgres flavor
  verbose: true,
  strict: true,
});
```

### 3.4 — Address the transaction gap

Four server actions in [`app/actions.ts`](../app/actions.ts) use
`db.transaction(...)` semantics implicitly via paired writes. With
`neon-http` they execute as separate HTTP requests, not in a single tx.

| Action | Risk | Mitigation |
|---|---|---|
| `castVote` (insert vote + read tally + maybe close case) | partial close on failure between writes | Make the case-close idempotent — re-tally on every vote, check threshold, only update if status still `voting` (which we already do) |
| `recordRepayment` (insert repayment + update loan) | repayment without loan update | Compensating job: nightly reconcile `loan.paid` against `SUM(repayments.amount)` |
| `approveMember` (update member + insert notification) | approval without notification | Same — notification is best-effort, approval is the source of truth |
| `broadcastNotification` (bulk insert) | partial broadcast | Make idempotent on `(actor_id, action, created_at_minute)` to allow safe retries |

If transactional integrity matters more than HTTP efficiency, use
`drizzle-orm/neon-serverless` for those specific actions and keep the
HTTP driver for everything else. Two clients, one app.

### 3.5 — Update env files + Cloudflare Worker secrets

```env
# .env.local — local dev
DATABASE_URL=postgresql://...@ep-xxx-pooler...neon.tech/neondb?sslmode=require
DATABASE_URL_DIRECT=postgresql://...@ep-xxx...neon.tech/neondb?sslmode=require
```

```bash
# Worker secrets (production)
cd next-app
wrangler secret put DATABASE_URL          # paste pooled URL
wrangler secret put DATABASE_URL_DIRECT   # paste direct URL
```

`SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_*` stay set during
the dual-write phase; remove after Phase 6 cutover.

---

## Phase 4 — Branch-per-PR workflow

This is Neon's killer feature. Each PR gets its own DB branch with the
full production schema + a snapshot of data. Tests run against the
branch. The branch is destroyed on merge.

### 4.1 — Add the official Neon GitHub Action

Edit [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml):

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

defaults:
  run:
    working-directory: next-app

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      # Create a Neon branch named after the PR + capture its URL.
      - name: Create Neon branch (PR only)
        if: github.event_name == 'pull_request'
        id: neon-branch
        uses: neondatabase/create-branch-action@v6
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          parent: main
          branch_name: pr-${{ github.event.number }}
          api_key: ${{ secrets.NEON_API_KEY }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with: { version: 9, run_install: false }

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: next-app/pnpm-lock.yaml

      - run: pnpm install --frozen-lockfile

      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test

      # Apply migrations on the PR branch + run integration tests
      - name: Apply migrations
        if: github.event_name == 'pull_request'
        run: pnpm db:migrate
        env:
          DATABASE_URL_DIRECT: ${{ steps.neon-branch.outputs.db_url }}

      - run: pnpm build
        env:
          DATABASE_URL: ${{ steps.neon-branch.outputs.db_url_pooled || secrets.DATABASE_URL }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

Add a sibling workflow that **deletes** the branch when the PR closes:

```yaml
# .github/workflows/neon-cleanup.yml
name: Delete Neon branch
on:
  pull_request:
    types: [closed]

jobs:
  delete:
    runs-on: ubuntu-latest
    steps:
      - uses: neondatabase/delete-branch-action@v3
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch: pr-${{ github.event.number }}
          api_key: ${{ secrets.NEON_API_KEY }}
```

Required GitHub secrets:
- `NEON_PROJECT_ID` — the project ID from `neonctl projects list`
- `NEON_API_KEY` — Neon dashboard → Account Settings → API Keys

### 4.2 — Local dev branches

When working on a non-trivial feature, branch the dev DB instead of
sharing the dev branch:

```bash
neonctl branches create --name feat-loan-form --parent dev
neonctl connection-string feat-loan-form     # paste into .env.local

# When the feature merges:
neonctl branches delete feat-loan-form
```

This is the same shape as `git switch -c`. The mental model is consistent.

---

## Phase 5 — Auth migration (separate stream from DB)

Plan this as a separate workstream, ideally after the DB cutover is
stable. **Do not** try to migrate DB and Auth in the same PR; the
rollback story becomes impossible.

### 5.1 — Stand up Better-Auth in parallel

```bash
pnpm add better-auth
```

Schema additions to `lib/db/schema.ts` (Better-Auth provides a generator):

```ts
import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name'),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

// Add `accounts`, `verifications` etc. — see Better-Auth docs
```

Then `lib/auth.ts`:

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  // ... magicLink, OAuth, etc.
});
```

Then replace `lib/supabase/server.ts` calls with `auth.api.getSession({ headers: req.headers })` in middleware + server actions.

### 5.2 — User migration script

`auth.users` from Supabase has `id`, `email`, `encrypted_password`,
`email_confirmed_at`, etc. Better-Auth uses bcrypt; Supabase uses bcrypt
too — the password hashes can transfer **if** Supabase stores them
unsalted in `encrypted_password`. Otherwise users need to reset their
password on first login post-migration.

```ts
// scripts/import-supabase-auth.ts
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import postgres from 'postgres';

const supabase = postgres(process.env.SUPABASE_DB_URL!);

const rows = await supabase`
  SELECT id, email, encrypted_password, email_confirmed_at
  FROM auth.users
  WHERE deleted_at IS NULL
`;

for (const u of rows) {
  await db.insert(users).values({
    id: u.id,                         // preserve UUIDs so members.auth_id keeps pointing
    email: u.email,
    emailVerified: u.email_confirmed_at !== null,
  }).onConflictDoNothing();
}
```

`members.auth_id` already references the Supabase user UUID; reusing
those IDs keeps every existing member row pointing at the right user
post-migration.

### 5.3 — Force re-auth on next visit

Even if password hashes transfer, force everyone to re-authenticate to
issue fresh Better-Auth sessions:

```ts
// app/middleware.ts — temporary, remove after rollout
const supabaseSessionCookie = request.cookies.get('sb-access-token');
if (supabaseSessionCookie) {
  // Clear stale cookie; redirect to /login
  request.cookies.delete('sb-access-token');
  return NextResponse.redirect(new URL('/login?reauth=true', request.url));
}
```

---

## Phase 6 — Storage migration (R2)

### 6.1 — Mirror buckets

```bash
# Install rclone with both backends configured
rclone config        # add 'supabase' (S3-compatible) + 'r2' (Cloudflare R2)
rclone copy supabase:avatars r2:barakah-avatars --progress
```

### 6.2 — Update upload code

`profile-form.tsx` currently uploads via `supabase.storage.from('avatars').upload(...)`. Replace with a server action that signs an R2 PUT URL:

```ts
// app/actions/upload.ts
'use server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { auth } from '@/lib/auth';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function getAvatarUploadUrl(filename: string) {
  const session = await auth.api.getSession({ headers: /* ... */ });
  if (!session) throw new Error('Not authenticated');

  const key = `${session.user.id}/avatar-${Date.now()}.${filename.split('.').pop()}`;
  const url = await getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: 'barakah-avatars', Key: key, ContentType: 'image/*' }),
    { expiresIn: 60 },
  );
  return { url, key };
}
```

Client uses fetch + PUT to the signed URL instead of the Supabase SDK call.

### 6.3 — Public read URL

R2 public buckets serve at `https://pub-<id>.r2.dev/<key>`. Update
`members.photo_url` rows to point to the new host:

```sql
UPDATE members
SET photo_url = REPLACE(
  photo_url,
  'https://<your-project>.supabase.co/storage/v1/object/public/avatars/',
  'https://pub-<r2-id>.r2.dev/'
)
WHERE photo_url LIKE '%supabase.co%';
```

---

## Phase 7 — Cutover schedule

Reversible at every step until Phase 7.4.

| Step | Effort | Reversible? |
|---|---|---|
| **7.1** Stand up Neon, dump/load schema + data | 1 day | Yes — Supabase keeps running |
| **7.2** Dual-write enabled — every server action writes to both DBs | 3 days | Yes — flip the env flag |
| **7.3** Validation — row counts, checksums, integration tests on Neon branch | 3 days | Yes |
| **7.4** Read flip — `DATABASE_URL` points to Neon, dual-write still on | 1 day | Yes — flip back |
| **7.5** Soak — week of dual-write, monitoring | 7 days | Yes |
| **7.6** Stop dual-write — Supabase becomes read-only archive | 1 day | Hard to reverse |
| **7.7** 30-day grace, then delete Supabase project | — | After this, no return |

Phases 5 (Auth) and 6 (Storage) run **after** 7.6 — never combine.

---

## Boilerplate — minimum-viable Drizzle + Neon TS app

Copy/paste-able starter for a new project on Neon (or to validate the
migration path before committing to it):

```bash
mkdir barakah-neon-spike && cd barakah-neon-spike
pnpm init
pnpm add @neondatabase/serverless drizzle-orm dotenv
pnpm add -D drizzle-kit typescript @types/node tsx
```

`drizzle.config.ts`
```ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL_DIRECT! },
  strict: true,
  verbose: true,
});
```

`src/schema.ts`
```ts
import { pgTable, uuid, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';

export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  nameEn: text('name_en').notNull(),
  monthlyPledge: integer('monthly_pledge').notNull().default(1000),
  deceased: boolean('deceased').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

`src/db.ts`
```ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

`src/seed.ts`
```ts
import 'dotenv/config';
import { db } from './db';
import { members } from './schema';

await db.insert(members).values([
  { username: 'admin',  nameEn: 'Admin' },
  { username: 'usman',  nameEn: 'Usman Baloch' },
]).onConflictDoNothing();

console.log('seeded');
```

`package.json` scripts
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate":  "drizzle-kit migrate",
    "db:push":     "drizzle-kit push",
    "db:studio":   "drizzle-kit studio",
    "seed":        "tsx src/seed.ts"
  }
}
```

`.env.local`
```env
DATABASE_URL=postgresql://...@ep-xxx-pooler...neon.tech/neondb?sslmode=require
DATABASE_URL_DIRECT=postgresql://...@ep-xxx...neon.tech/neondb?sslmode=require
```

Run:
```bash
pnpm db:generate
pnpm db:migrate           # creates the table on Neon
pnpm seed                 # inserts test rows
pnpm db:studio            # opens GUI at https://local.drizzle.studio
```

If this works in <10 minutes, you're set up correctly. Then port the
Barakah Hub schema (~10 tables) the same way.

---

## When to revisit

Re-evaluate this migration if:
- Supabase imposes a pricing tier we can't absorb at Barakah Hub's scale.
- We need DB-branch-per-PR badly enough to justify three vendors.
- Cloudflare R2 + Neon offer a unified billing/dashboard story we want
  (not yet — they're separate products under separate accounts).
- A regulator demands data residency Supabase can't provide.

Until one of those triggers fires: this doc is reference, not action.

---

## See also

- [`BACKEND_ALTERNATIVES.md`](./BACKEND_ALTERNATIVES.md) — broader comparison (Appwrite / PocketBase / Nhost / Turso) and the original "stay on Supabase" recommendation.
- [`AUDIT_PHASE3.md`](../AUDIT_PHASE3.md) — security-model notes; especially the section on RLS posture which needs revisiting if you adopt Better-Auth.
- [Neon docs — branching](https://neon.tech/docs/introduction/branching)
- [Better-Auth docs](https://www.better-auth.com/)
- [OpenNext + Neon recipe](https://opennext.js.org/cloudflare/howtos/neon)
