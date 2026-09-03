import 'server-only';

import { setupServer } from 'msw/node';

import { handlers } from './handlers';

type MockServer = ReturnType<typeof setupServer>;

/**
 * D1 — the interceptor for the Next.js server process.
 *
 * All Java backend I/O is server-side (`client.ts` is `server-only`), so a
 * single Node-side interceptor covers both Server Component reads and the BFF
 * routes that Client Components query through.
 *
 * Activation is bound to the instance rather than performed once from
 * `instrumentation.ts`. Without this, a hot reload produces a fresh, unpatched
 * `setupServer()` that nobody calls `listen()` on, and every mocked call then
 * fails as a NETWORK error until the dev server is restarted.
 *
 * KNOWN LIMITATION, measured rather than assumed: editing application code
 * keeps mocking alive, but instrumentation modules sit outside the HMR graph,
 * so a change to `db.ts` or `handlers.ts` is NOT picked up by the running
 * server. Restart the dev server after editing a fixture or a handler.
 */
const globalForMocks = globalThis as typeof globalThis & {
  __mswServer?: MockServer;
};

function activateMockServer(): MockServer {
  const existing = globalForMocks.__mswServer;

  if (existing) {
    // Reuse the already-patched instance and adopt whatever handlers this
    // evaluation compiled.
    existing.resetHandlers(...handlers);
    return existing;
  }

  const created = setupServer(...handlers);
  /*
   * `onUnhandledRequest: 'bypass'` is deliberate: an endpoint with no handler
   * yet must fail the way an unimplemented backend route fails, surfacing as a
   * normalised ApiError, rather than being masked by a mock-layer warning.
   */
  created.listen({ onUnhandledRequest: 'bypass' });
  globalForMocks.__mswServer = created;

  return created;
}

export const server: MockServer = activateMockServer();
