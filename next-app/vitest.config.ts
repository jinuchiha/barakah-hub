import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    // Several action tests re-import the whole app/actions graph per test
    // (vi.resetModules). On slower Windows dev machines that import alone
    // can exceed the 5s default and abort mid-flight, poisoning the next
    // test's mock state. CI is unaffected; correctness is asserted, not speed.
    testTimeout: 30_000,
    hookTimeout: 120_000,
    include: ['test/**/*.test.{ts,tsx}'],
    css: false,
  },
});
