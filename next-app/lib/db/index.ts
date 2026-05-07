/**
 * Postgres client (Drizzle + postgres-js)
 *
 * Two clients:
 *  - `db`        — single client for general use (Transaction pooler in prod)
 *  - `dbAdmin`   — service-role client (bypasses RLS, server-only)
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Fail loudly only when actually invoked, not at import-time during build
  console.warn('[db] DATABASE_URL not set');
}

// Reuse the same client across hot reloads in dev to avoid connection storms
const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb.pgClient ??
  postgres(connectionString!, {
    prepare: false, // required for Supabase Transaction pooler
    max: 10,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
export { schema };
