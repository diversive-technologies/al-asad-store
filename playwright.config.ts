import { defineConfig, devices } from '@playwright/test';

import { E2E_BASE_URL, E2E_PORT } from './tests/e2e/support/server';

/**
 * TEST-07 — the critical customer journeys, end to end: a real `next dev`, the
 * real Route Handlers and the real typed client, with MSW standing in for the
 * Java service inside that server process exactly as it does in development (D1).
 * Nothing here stubs the application; the browser only ever talks to the store.
 *
 * `npm run test:e2e`. Unit and component tests stay in Vitest (`npm run test`),
 * whose `include` is `src/**` — this suite lives in `tests/e2e`, so neither
 * runner collects the other's files.
 *
 * ## Why the server is started this way
 *
 * - **A fresh server for every run** (`reuseExistingServer: false`). The mock
 *   stores are in memory, so a server left over from an earlier run — or a
 *   developer's own — would hand every journey stock that is already held and
 *   carts that already exist. Playwright refuses to start if port 3107 is busy,
 *   which is the right answer rather than testing whatever is there.
 * - **Stop your own `npm run dev` first.** A different port keeps the suite from
 *   TESTING a developer's server; it does not let the two run side by side.
 *   Next 16 allows one `next dev` per project directory — the first holds a lock
 *   on `.next/dev` — so this one prints "Another next dev server is already
 *   running" and exits, and the run fails before the first journey. Giving it a
 *   `distDir` of its own is not the way round it: `next dev` then adds that
 *   directory's generated types to `tsconfig.json`, and a type check reads both
 *   sets of route declarations, which declare the same globals twice.
 * - **One worker, in file order.** One dev server compiles each route on its
 *   first request, and the mock layer's interception is re-armed per request
 *   (`src/lib/mocks/node.ts`). Parallel browsers racing first compiles bought
 *   nothing but timeouts, and every journey creates its own customer, cart and
 *   measurements, so none depends on another having run.
 * - **The backend address points at nothing.** Every call MSW intercepts never
 *   leaves the process; one it does NOT intercept would otherwise go to
 *   `JAVA_API_BASE_URL` from `.env.local` — a real service, if one is running on
 *   this machine. Port 9 is the discard port, which nothing here listens on, so
 *   such a call is refused at once and fails the journey visibly instead.
 * - **Every route is compiled, and the mock proven to answer, before the first
 *   journey** (`tests/e2e/global-setup.ts`). A mock that has stopped
 *   intercepting stops the run there, by name, instead of failing every
 *   journey in a different place.
 * - **The app's own address is this server's.** `NEXT_PUBLIC_APP_URL` builds the
 *   canonical link a product page copies, so it has to be the address the
 *   browser is actually on.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './tests/e2e/global-setup.ts',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  /* A route's first request in `next dev` compiles it, which can take several
     seconds; these ceilings allow for that without hiding a real hang. */
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: E2E_BASE_URL,
    navigationTimeout: 60_000,
    actionTimeout: 20_000,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${String(E2E_PORT)}`,
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      API_MOCKING: 'enabled',
      JAVA_API_BASE_URL: 'http://127.0.0.1:9',
      NEXT_PUBLIC_APP_URL: E2E_BASE_URL,
    },
  },
});
