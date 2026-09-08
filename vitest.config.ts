import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/** §20 — Vitest for unit and integration; Playwright covers E2E separately. */
export default defineConfig({
  resolve: {
    alias: {
      // STRUCT-07: the same `@/*` alias the compiler uses.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      /*
       * `server-only` is a BUNDLER guard, not a runtime one: its default export
       * throws so that a Client Component importing a server module fails the
       * build. It ships an `empty.js` for exactly the case where that guard has
       * nothing to protect, selected by the `react-server` export condition —
       * which Vitest, being neither a bundler nor a browser, does not set.
       *
       * Without this, every module that transitively reaches `env.server.ts` is
       * untestable, which is most of the mock layer that stands in for Java.
       * Pointing at the package's own shim keeps that decision visible here
       * rather than hidden in a stub file of our own.
       */
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    /*
     * SSOT-03 validates the environment at boot and throws when it is invalid
     * (ERR-06) — and a test process is a boot. These are the minimum for the
     * schema to parse, not fixtures: no test asserts against them, and the
     * try-on provider key is deliberately absent so the suite exercises the
     * unconfigured path that §28.5 describes.
     */
    env: { JAVA_API_BASE_URL: 'http://localhost:8080' },
  },
});
