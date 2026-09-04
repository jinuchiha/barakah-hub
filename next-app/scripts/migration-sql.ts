/**
 * Pure helpers for the migration runner.
 *
 * Split out of migrate.ts so they can be unit-tested without importing a
 * module whose top level connects to a database and runs migrations.
 */
/** Split a SQL file into individual statements, respecting dollar-quoted bodies. */
export function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inDollar = false;
  let dollarTag = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    const next2 = sql.slice(i, i + 2);

    if (inLineComment) {
      buf += c;
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      buf += c;
      if (next2 === '*/') { buf += sql[i + 1]; i++; inBlockComment = false; }
      continue;
    }
    if (!inDollar) {
      if (next2 === '--') { inLineComment = true; buf += c; continue; }
      if (next2 === '/*') { inBlockComment = true; buf += c; continue; }
    }

    // Detect dollar-quoted body open/close: $$ or $tag$
    if (c === '$') {
      const m = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (m) {
        const tag = m[0];
        if (!inDollar) {
          inDollar = true;
          dollarTag = tag;
        } else if (tag === dollarTag) {
          inDollar = false;
          dollarTag = '';
        }
        buf += tag;
        i += tag.length - 1;
        continue;
      }
    }

    if (c === ';' && !inDollar) {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = '';
      continue;
    }
    buf += c;
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

/**
 * Patterns we treat as "the migration meant to do this but the DB
 * already has it". Each entry is a regex matched (case-insensitive)
 * against the error message. NEVER use bare substrings here — a loose
 * substring like `'relation'` would also match "relation X does not
 * exist", silently masking real bugs.
 */
const TOLERABLE: RegExp[] = [
  // CREATE TYPE / TABLE / INDEX / EXTENSION etc. that's already there
  /already exists/i,
  /duplicate(_object| object)/i,
  /duplicate(_column| column)/i,
  // Supabase-specific schema/role references in 0001 — no-ops on Neon.
  // Authorization is enforced in app code, not DB-level RLS, so these
  // missing policy targets don't reduce security.
  /schema "auth" does not exist/i,
  /schema "storage" does not exist/i,
  /function auth\.uid\(\) does not exist/i,
  /relation "storage\.(buckets|objects)" does not exist/i,
  /role "(authenticated|anon|service_role|supabase_admin)" does not exist/i,
  // Re-running 0001 on a Neon branch copied from prod: members.auth_id
  // is TEXT there (0004 swapped it), so the legacy Supabase RLS helpers
  // comparing it to auth.uid() fail at CREATE with a type error. Exact
  // messages only — a loose "operator does not exist" would mask real
  // type bugs in new migrations.
  /operator does not exist: text = uuid/i,
  /function (is_admin|my_member_id)\(\) does not exist/i,
];

/**
 * Uniqueness violations used to sit in TOLERABLE so re-running the config
 * singleton INSERT was a no-op. But the list applies to EVERY statement of
 * EVERY migration, so any future data backfill that hit a unique constraint
 * would be silently swallowed and the migration then marked as applied —
 * the failure mode where the schema says "done" and the data is wrong.
 *
 * Uniqueness is now tolerated only for statements that are explicitly
 * idempotent inserts, which the SQL declares for itself with
 * `ON CONFLICT DO NOTHING`.
 */
const UNIQUE_VIOLATION = /duplicate key value|violates unique constraint/i;

export function isTolerable(err: unknown, stmt: string): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (UNIQUE_VIOLATION.test(msg)) {
    return /on\s+conflict\s+do\s+nothing/i.test(stmt);
  }
  return TOLERABLE.some((rx) => rx.test(msg));
}
