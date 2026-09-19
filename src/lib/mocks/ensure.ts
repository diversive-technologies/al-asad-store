import 'server-only';

import { serverEnv } from '@/config/env.server';

/**
 * D1 — arms the mock layer for the module context handling this request.
 *
 * Called from the root layout and every Route Handler, so it runs on every
 * request rather than only at boot. That is the point: `instrumentation.ts`
 * fires once per server start, but a hot reload can give the application a
 * fresh module context, and Next's dev server puts its boot-time `fetch` back on
 * every server-side update, which throws MSW's proxy away (`node.ts` has the
 * detail). Re-asserting per request costs an identity check once armed, and
 * removes an entire class of "the store could not be reached" failures.
 *
 * IMP-01a: the import is dynamic so `msw/node` is never traced into a runtime
 * that cannot resolve it, and never pulled in at all once mocking is off.
 *
 * This whole module disappears with D1, when the Java service replaces the
 * mock layer.
 */
export async function ensureMockServer(): Promise<void> {
  if (serverEnv.API_MOCKING !== 'enabled') return;

  const { startMockServer } = await import('./node');
  startMockServer();
}
