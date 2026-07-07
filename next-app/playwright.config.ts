import { defineConfig } from '@playwright/test';

/**
 * Synthetic smoke check against the live deployed app — not a PR gate.
 * There's no local Postgres stand-in for Neon's HTTP driver, so this
 * hits the real production URL read-only instead of spinning up a
 * throwaway DB + `next start` in CI.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? 'https://barakah-hub.vercel.app',
  },
});
