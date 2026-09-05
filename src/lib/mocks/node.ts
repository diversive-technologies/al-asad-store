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
 *
 * ## Why the previous interceptor must be CLOSED
 *
 * The module flag alone re-arms correctly but never disarms, and `listen()`
 * patches machinery that is shared across contexts. Every hot reload therefore
 * left another live interceptor behind, and a single outgoing request was
 * handled once PER accumulated interceptor — so one "Add to bag" ran the
 * reservation four times and put a quantity of 2 in the bag.
 *
 * The registry below is the missing half. It is deliberately keyed with
 * `Symbol.for`, which resolves to the same symbol across module contexts, and
 * it holds only the ACTIVE server so the stale one can be closed before the
 * replacement listens. This is not the `globalThis` cache that was tried and
 * removed: that one RETURNED the old server and so never re-patched the new
 * context. This one keeps re-patching, and cleans up after itself.
 */
const ACTIVE_SERVER = Symbol.for('al-asad.mocks.activeServer');

type ServerRegistry = typeof globalThis & { [ACTIVE_SERVER]?: MockServer };

/** Per-context: false again in every fresh module context, which is the trigger. */
let armedInThisContext = false;

export function startMockServer(): void {
  if (armedInThisContext) return;

  const registry = globalThis as ServerRegistry;

  // Whatever a previous context installed is now orphaned; stop it intercepting.
  registry[ACTIVE_SERVER]?.close();

  const server = setupServer(...handlers);
  /*
   * `onUnhandledRequest: 'bypass'` is deliberate: an endpoint with no handler
   * yet must fail the way an unimplemented backend route fails, surfacing as a
   * normalised ApiError, rather than being masked by a mock-layer warning.
   */
  server.listen({ onUnhandledRequest: 'bypass' });

  registry[ACTIVE_SERVER] = server;
  armedInThisContext = true;
}
