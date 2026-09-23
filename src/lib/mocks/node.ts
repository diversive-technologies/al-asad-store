import 'server-only';

import { setupServer } from 'msw/node';

import { handlers } from './handlers';
import { restoreMockSession, type MockSession } from './session-snapshot';

/**
 * D1 — the interceptor for the Next.js server process.
 *
 * All Java backend I/O is server-side (`client.ts` is `server-only`), so a
 * single Node-side interceptor covers both Server Component reads and the BFF
 * routes that Client Components query through. MSW works by REPLACING
 * `globalThis.fetch` with its own proxy; everything below is about keeping that
 * replacement in force for as long as the process lives.
 *
 * ## Two reasons to arm, and they are different
 *
 * **A fresh module evaluation takes over.** Turbopack evaluates this module once
 * per LAYER — instrumentation, the RSC layer that renders pages, the layer that
 * runs Route Handlers — and again whenever an edit reaches it. Each evaluation
 * carries its own `handlers`, and with them its own copy of every mock store. So
 * the first call from an evaluation arms ITS handlers, as it always has.
 *
 * **Next's dev server can take the proxy away without evaluating anything.**
 * This is why MSW kept dying "within minutes of a fresh start and after one or
 * two edits, one of them a comment":
 *
 * - `router-server.js` captures `globalThis.fetch` when the dev server boots,
 *   before anything is mocked, and hands the hot reloader a `resetFetch()` that
 *   puts that pristine fetch back;
 * - the Turbopack hot reloader calls `resetFetch()` whenever ANY server output
 *   changes (`clearRequireCache`), so Next can re-apply its own fetch patch — and
 *   MSW's proxy is thrown away with it;
 * - Server Fast Refresh (on by default in Next 16) updates only the modules that
 *   changed, in place, so an edit anywhere outside the mock layer did not
 *   re-evaluate this module. Its "armed" flag stayed true, nothing re-armed, and
 *   every mocked read went to `JAVA_API_BASE_URL` and failed with ECONNREFUSED.
 *
 * So the active server also records the fetch it installed. When the fetch in
 * force is no longer that one, the SAME handlers are armed again — the ones that
 * were serving, not this evaluation's — so the carts, orders and profiles held in
 * that layer's stores stay the ones every request sees. Re-arming with whichever
 * layer happened to ask first would swap stores on alternate requests.
 *
 * ## Why the previous interceptor must be CLOSED, and fetch then restored
 *
 * `listen()` patches machinery shared across module contexts, and a second
 * server started while the first is still registered does not patch fetch at
 * all: `@mswjs/interceptors` finds the running instance and only forwards
 * listeners to it. Left open, every re-arm also added one more interceptor, and
 * one outgoing request was handled once PER interceptor — one "Add to bag" ran
 * the reservation four times. So the previous server is closed first.
 *
 * Closing restores the fetch THAT server wrapped, which may be a chain Next has
 * since discarded. The fetch in force just before closing is put back instead —
 * unless it is the closed server's own proxy, in which case the restore already
 * did the right thing. The new server then wraps whatever Next currently has.
 *
 * The registry is keyed with `Symbol.for`, which resolves to the same symbol
 * across module contexts, and holds only the ACTIVE server.
 */
const ACTIVE_SERVER = Symbol.for('al-asad.mocks.activeServer');

interface ArmedServer {
  readonly close: () => void;
  /** The `globalThis.fetch` this server installed. */
  readonly fetch: unknown;
  /** Arms the handlers of the evaluation that armed this server, or `null` if unknown. */
  readonly armAgain: (() => void) | null;
  /**
   * Restores a session into the stores THESE handlers read, or `null` if unknown.
   *
   * The same reasoning as `armAgain`, and it is load-bearing for the same
   * reason. Each module context has its own copy of every store, so a restore
   * performed against the context that happens to be handling the request can
   * land in a `CARTS` map that nothing is serving from. That is not
   * hypothetical: hydrating through a plain import put the bag back where the
   * Route Handler could see it and the page could not, so `/api/bag` answered
   * with the line while `/bag` rendered "Your bag is empty".
   */
  readonly restore: ((session: MockSession) => void) | null;
}

/** Per evaluation: false in every fresh module context, which is when it takes over. */
let armedInThisContext = false;

/** A value's zero-argument method, bound to it, when it has one. */
function methodOf(value: unknown, name: 'close' | 'armAgain'): (() => void) | null {
  if (typeof value !== 'object' || value === null || !(name in value)) return null;
  const method: unknown = Reflect.get(value, name);
  return typeof method === 'function' ? () => method.call(value) : null;
}

/** The slot's `restore`, bound to it, when it has one. TS-03: narrowed, not cast. */
function restoreOf(value: unknown): ((session: MockSession) => void) | null {
  if (typeof value !== 'object' || value === null || !('restore' in value)) return null;
  const method: unknown = Reflect.get(value, 'restore');
  return typeof method === 'function'
    ? (session: MockSession) => {
        method.call(value, session);
      }
    : null;
}

/*
 * TS-03: the registry slot is read through `Reflect` and NARROWED, not cast onto
 * `globalThis`. Whatever sits there was put there by a previous module context,
 * so it is checked for what this file needs before it is trusted.
 *
 * A slot holding a bare server is the shape this file used to write. It is still
 * closed — a server left registered makes the next one forward to it instead of
 * patching fetch — and it never counts as armed for the fetch in force.
 */
function armedServer(): ArmedServer | null {
  const slot: unknown = Reflect.get(globalThis, ACTIVE_SERVER);
  const close = methodOf(slot, 'close');
  if (typeof slot !== 'object' || slot === null || close === null) return null;

  return {
    close,
    fetch: 'fetch' in slot ? slot.fetch : null,
    armAgain: methodOf(slot, 'armAgain'),
    restore: restoreOf(slot),
  };
}

/** Stops a server intercepting, keeping the fetch Next has in force now. */
function retire(previous: ArmedServer): void {
  const inForce = globalThis.fetch;
  previous.close();
  if (inForce !== previous.fetch) globalThis.fetch = inForce;
}

/** Arms THIS evaluation's handlers and registers them as the active server. */
function armHere(): void {
  const server = setupServer(...handlers);
  /*
   * `onUnhandledRequest: 'bypass'` is deliberate: an endpoint with no handler
   * yet must fail the way an unimplemented backend route fails, surfacing as a
   * normalised ApiError, rather than being masked by a mock-layer warning.
   */
  server.listen({ onUnhandledRequest: 'bypass' });

  Reflect.set(globalThis, ACTIVE_SERVER, {
    fetch: globalThis.fetch,
    close: () => server.close(),
    armAgain: armHere,
    // Bound to THIS context's stores, which are the ones these handlers read.
    restore: restoreMockSession,
  });
}

/** Arms the mock layer if it is not in force. A cheap identity check once it is. */
export function startMockServer(): void {
  const armed = armedServer();

  if (!armedInThisContext) {
    if (armed !== null) retire(armed);
    armHere();
    armedInThisContext = true;
    return;
  }

  if (armed !== null && armed.fetch === globalThis.fetch) return;

  // Next put its boot-time fetch back: arm the handlers that were serving again.
  if (armed !== null) retire(armed);
  (armed?.armAgain ?? armHere)();
}

/**
 * The restore belonging to the handlers currently serving, if any.
 *
 * `hydrateMockSession` uses this in preference to its own import, so a session
 * is put back into the stores that will actually answer the request rather
 * than into whichever context happened to read the cookie.
 */
export function activeRestore(): ((session: MockSession) => void) | null {
  return armedServer()?.restore ?? null;
}

/** Test seam: stops intercepting and forgets the server. */
export function stopMockServer(): void {
  armedServer()?.close();
  Reflect.deleteProperty(globalThis, ACTIVE_SERVER);
}
