import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * OpenNext config for Cloudflare Workers.
 *
 * - The Worker entry is built to `.open-next/worker.js`.
 * - Static assets are emitted to `.open-next/assets/`.
 * - We bind the assets via wrangler.toml as `ASSETS`.
 * - Incremental cache is set to `dummy` for now (sufficient for our
 *   server-rendered, no-static-output workload). Switch to `r2-incremental-cache`
 *   if/when we want full ISR with shared edge caching.
 */
export default defineCloudflareConfig({
  // Default settings work for our app:
  //   - Node.js runtime via nodejs_compat
  //   - Edge-rendered server pages
  //   - Image optimisation disabled (matches next.config.mjs)
});
