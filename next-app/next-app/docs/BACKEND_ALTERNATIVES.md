# Backend alternatives to Supabase — comparison + implementation strategy

> Written for **Barakah Hub** (Next.js 16, Postgres-relational data model,
> Drizzle ORM, ~10 tables with FKs, append-only audit log, Islamic-finance
> compliance). Not a generic comparison.

---

## TL;DR — should we migrate?

**No.** None of the four alternatives is clearly better for this app's
shape. Supabase fits because:

- The data model is relational with hard FKs (members → payments → cases →
  votes → loans). Document stores like Appwrite force denormalization or
  emulated joins.
- Auth + Storage + Realtime + Postgres in one product means one vendor,
  one billing surface, one outage surface.
- The free tier covers family-scale use indefinitely.
- The audit + remediation work in
  [`AUDIT_PHASE3.md`](../AUDIT_PHASE3.md) is Supabase-shaped.

**If forced to pick one anyway:** **Nhost** is the closest like-for-like
(Postgres + Hasura + auth + storage). **Turso/Drizzle** is interesting
purely as a DB swap, not a Supabase replacement.

The rest of this doc is the evidence behind that recommendation.

---

## Decision matrix

| | **Supabase** *(current)* | **Appwrite** | **PocketBase** | **Nhost** | **Turso + Drizzle** |
|---|---|---|---|---|---|
| Database | Postgres | NoSQL document (Mongo-like) | SQLite (relational) | Postgres | libSQL (SQLite at edge) |
| Auth | ✓ JWT, magic-link, OAuth | ✓ JWT, OAuth, anonymous | ✓ JWT, OAuth | ✓ JWT, magic-link, OAuth | ✗ bring your own (NextAuth, Clerk, Lucia) |
| Storage | ✓ S3-compatible | ✓ built-in | ✓ filesystem-backed | ✓ S3-compatible | ✗ bring your own (S3, R2) |
| Realtime | ✓ row-level via Postgres `LISTEN` | ✓ websocket | ✓ websocket | ✓ via Hasura subscriptions | ✗ bring your own |
| Edge functions | ✓ Deno (Edge Functions) | ✓ multiple runtimes | ✓ JS hooks (Goja-embedded) | ✓ Node functions | n/a |
| Self-host? | ✓ via Supabase OSS | ✓ Docker / Helm | ✓ single binary | ✓ via Hasura OSS + Postgres | ✗ Turso is hosted |
| Hosted free tier | 500 MB DB / 1 GB storage / 50 K MAU | 75K users / generous | n/a (self-host only) | 1 GB DB / 1 GB storage / 50 K MAU | 9 GB / 1 B reads / 25 M writes |
| RLS / row policy | ✓ Postgres RLS | ✗ collection-level only | ✓ rule expressions | ✓ Hasura permissions | ✗ enforced in app code |
| TypeScript SDK | ✓ first-class | ✓ first-class | ✓ first-class | ✓ via Hasura GraphQL codegen | ✓ Drizzle |
| Native admin UI | ✓ excellent | ✓ excellent | ✓ excellent | ✓ via Hasura console | ✗ minimal |
| Migration effort *from current state* | n/a (status quo) | **HIGH** — schema + auth + storage rewrite | **HIGH** — auth + storage rewrite | **MEDIUM** — auth rewires; schema mostly carries | **MEDIUM** — DB-only swap; still need auth/storage |

---

## Per-option assessment

### Appwrite — open-source, generous

**Strengths**
- Best-in-class self-host story (Docker compose up, you have a backend).
- Multi-runtime edge functions (Node, Deno, Python, Dart, Bun).
- Cloud + self-host parity.
- Generous free tier.

**Why it's wrong for Barakah Hub**
- The DB is **NoSQL document-style** (collections, attributes, relationships
  are emulated, not enforced). Our schema has hard FKs (`members.parent_id`
  → `members.id`, `payments.member_id` → `members.id`, `votes.case_id` →
  `cases.id`, etc.), check constraints (`paid <= amount`), composite
  primary keys (`votes(case_id, member_id)`). Modeling these in Appwrite
  collections means hand-rolling enforcement in app code.
- No row-level security — only collection-level rules. The *sadqa* privacy
  rule ("members see only their own payments") is harder to express.
- Drizzle ORM is wasted; Appwrite has its own SDK.

**Migration effort (if you went anyway):** ~3 weeks
- Re-model 10 tables as collections + relationship attributes
- Rewrite all `db.select(...)` calls (~70 sites)
- Reimplement auth gates in collection rules
- Storage bucket → Appwrite Storage (similar API)

### PocketBase — single binary, ergonomic

**Strengths**
- Truly single-file deploy (Go binary). Easiest ops story by far.
- Embedded SQLite supports relational FKs, composite keys, check constraints.
- Excellent admin UI; rule expressions are readable (`@request.auth.id != ""`).
- Realtime subscriptions built in.
- JS hooks for server-side validation.

**Why it's wrong for Barakah Hub**
- **SQLite means single-instance** — no clustering, no read replicas. You
  can scale vertically, not horizontally. Acceptable for family scale,
  poor story for multi-tenant SaaS.
- Storage is filesystem-backed — fine for the hosting box, awkward for
  CDN-backed avatars.
- No managed cloud; you self-host on a VPS. Adds ops burden.
- Supabase Auth's magic-link / OAuth flows are broader.

**Migration effort:** ~2 weeks
- Schema port is mostly direct (PocketBase collections accept relations)
- Rewrite ~70 query sites to PocketBase JS SDK
- Auth: Supabase JWT → PocketBase JWT (cookie format different)
- Storage: bucket → PocketBase files API

### Nhost — Postgres + Hasura + GraphQL

**Strengths**
- **Postgres** — schema, RLS, FKs, check constraints all carry over.
- Hasura permissions cover the same ground as RLS, expressed differently.
- GraphQL subscriptions for realtime.
- Auth + storage + functions in one platform.
- Self-host via Hasura OSS + your own Postgres.

**Why it might be wrong for Barakah Hub**
- GraphQL is a paradigm shift from the current SQL-via-Drizzle pattern.
  We'd add `graphql-request` / `urql` / Apollo, code-gen typed queries
  from the schema, and rewrite every `db.select(...)` into a query string.
- Drizzle is wasted on the read path (you'd query Hasura); still useful
  for migrations.
- Hasura permissions ≠ Postgres RLS. The translation is mostly
  mechanical, but `is_admin()` SECURITY DEFINER functions need to become
  Hasura preset values + permission rules.

**Migration effort:** ~2 weeks
- Schema carries over; RLS rewritten as Hasura permissions
- Replace direct `db` calls with Hasura GraphQL queries (codegen helps)
- Auth flow swap: Supabase Auth → Nhost Auth (similar shape)
- Storage: similar S3-style API

**This is the most defensible swap if you really want to leave Supabase.**

### Turso + Drizzle — edge-native libSQL

**Strengths**
- **Drizzle already in the codebase** — Turso speaks libSQL, which Drizzle
  supports natively. Schema migrations carry over with `dialect: 'sqlite'`.
- Multi-region read replicas with single-digit-ms latency at the edge.
- Massive free tier.
- Hot-spot embedded SQLite for dev → prod parity.

**Why it's not a Supabase replacement**
- **Just a database.** No auth, no storage, no realtime. You assemble
  the rest:
  - Auth → NextAuth.js, Clerk, Lucia, WorkOS
  - Storage → Cloudflare R2, AWS S3, UploadThing
  - Realtime → Pusher, Ably, Liveblocks, or roll your own with SSE
- libSQL is SQLite-flavoured; some Postgres features (window functions,
  `pg_trgm`, JSONB operators, generated columns variations) don't carry.
  Audit our queries for incompatibilities first.
- RLS isn't a thing in SQLite/libSQL. App-layer enforcement only — same
  posture we already documented for the Drizzle path on Supabase, but
  without the *option* to turn RLS on later.

**Migration effort (DB only):** ~3 days
- Switch Drizzle `dialect` and connection string
- Adjust SQL incompatibilities (jsonb, RLS-specific code)
- Set up auth + storage + realtime *separately* (this is the real cost)

**If you do this:** the realistic combo is **Turso + Clerk + Cloudflare R2**.
Total stack count goes from 1 (Supabase) to 3.

---

## Recommendation

**Stay on Supabase.** The audit fixes, RLS posture, and AUDIT_PHASE3 work
all assume Supabase shape. Family-scale traffic doesn't strain the free
tier. Migration risk is high (data integrity + auth flow rewrite) and
benefit is unclear.

**If a specific Supabase pain emerges**, here's how each alternative fits:

| Pain | Best alternative |
|---|---|
| "Supabase is too expensive at scale" | Nhost (similar shape, you control the cost dials by self-hosting Hasura) |
| "We need to self-host on a single $5 VPS" | PocketBase |
| "We want edge-replicated reads everywhere" | Turso (DB) + Clerk + R2 |
| "We want a fully open-source stack" | Appwrite OSS or Nhost (Hasura OSS + your Postgres) |

---

## Implementation strategy *(if you commit to migrating)*

The work is the same shape regardless of target — phased, reversible.

### Phase 1 — feature flag + dual-write (1 week)

1. Add `lib/db/provider.ts` that exports a tagged union: `'supabase'` |
   `<target>`. Read from `process.env.DB_PROVIDER`.
2. Implement the new provider as a thin facade (`getMembers`, `insertPayment`, etc.).
3. Refactor `app/actions.ts` to call the facade rather than Drizzle directly.
4. **Dual-write**: every mutation writes to both backends. Read still
   from Supabase.

### Phase 2 — schema parity + reconciliation (1 week)

1. Replay history into the new backend.
2. Compare row counts + checksums table-by-table.
3. Fix any drift (FKs, defaults, enum values).

### Phase 3 — flip reads (3 days)

1. Switch read paths to the new backend behind the flag.
2. Run for a week with dual-write still on (so we can flip back).
3. Monitor error rates + p99 latency.

### Phase 4 — cutover (1 day)

1. Stop writing to Supabase.
2. Snapshot Supabase DB to S3/R2 for archival.
3. Cancel Supabase project after a 30-day grace window.

### Phase 5 — auth migration (separate stream — 1 week)

Not part of the DB swap. Auth migration is its own phased flow:
1. Stand up new auth provider in parallel.
2. Add a "claim account" flow on next login that re-authenticates the
   user against the new provider and links to their existing `members.id`.
3. Once 90 % of MAU has migrated, force the rest on next login.

---

## How to revisit this decision

Triggers that would justify revisiting:
- Supabase pricing tier you can't afford
- A regulator requiring data residency Supabase doesn't offer
- Hard product requirement (e.g. air-gapped on-prem deploy) Supabase can't meet
- Genuine GraphQL-native frontend (e.g. mobile + web sharing one schema)

Until one of those is true: **stay**.
