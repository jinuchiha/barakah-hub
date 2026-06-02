import type { Config } from 'drizzle-kit';

/**
 * Drizzle Kit reads from this config for `pnpm db:*` commands (generate,
 * migrate, push, studio).
 *
 * IMPORTANT: migrations issue prepared statements + DDL that PgBouncer's
 * transaction-pool mode rejects. Use the **direct** (non-pooler) Neon
 * connection here, not the pooled one. Falls back to DATABASE_URL only
 * if DATABASE_URL_DIRECT isn't set (dev convenience).
 */
export default {
  schema: './lib/db/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
