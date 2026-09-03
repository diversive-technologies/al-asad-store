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
 * The singleton is deliberately module-scoped rather than cached on
 * `globalThis`, and that distinction is the whole fix.
 *
 * MSW works by patching request machinery *in the context where `listen()`
 * ran*. Turbopack re-evaluates server modules into a fresh module context on
 * recompile, and the previous context's patch does not carry over — every
 * mocked call then fails with ECONNREFUSED until the dev server is restarted.
 * A `globalThis` cache made that worse, not better: it returned the old server
 * that had patched a context nobody was using any more, so `listen()` was never
 * called again.
 *
 * A module-scoped flag is false again in each new context, which is exactly
 * when the patch needs re-applying. `startMockServer` is therefore a cheap
 * no-op on every call but the first per context.
 */
let server: MockServer | null = null;

export function startMockServer(): void {
  if (server !== null) return;

  server = setupServer(...handlers);
  /*
   * `onUnhandledRequest: 'bypass'` is deliberate: an endpoint with no handler
   * yet must fail the way an unimplemented backend route fails, surfacing as a
   * normalised ApiError, rather than being masked by a mock-layer warning.
   */
  server.listen({ onUnhandledRequest: 'bypass' });
}
