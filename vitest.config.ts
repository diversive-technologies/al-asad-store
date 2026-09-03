import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/** §20 — Vitest for unit and integration; Playwright covers E2E separately. */
export default defineConfig({
  resolve: {
    // STRUCT-07: the same `@/*` alias the compiler uses.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
