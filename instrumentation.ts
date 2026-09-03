import { serverEnv } from '@/config/env.server';

/**
 * D1 — brings up the mock layer when the Next.js server boots.
 *
 * The import below is loaded for its side effect: `@/lib/mocks/node` activates
 * and patches on evaluation, so that a hot reload of the handlers re-activates
 * automatically. That is deliberate — see the rationale in that module.
 */
export async function register(): Promise<void> {
  /*
   * SSOT-03 exception, stated (§22-J): `process.env.NEXT_RUNTIME` is read
   * literally here rather than through `serverEnv`.
   *
   * It is not configuration — it is the token Next substitutes at build time so
   * the bundler can statically eliminate this branch. Read through a validated
   * object it becomes a runtime value, the branch survives into the edge
   * bundle, and resolution of `msw/node` then fails there: the export map of
   * `@mswjs/interceptors` sets `"browser": null` for its Node interceptors.
   *
   * IMP-01a: the import is dynamic for the same reason — it must not be traced
   * into a runtime that cannot resolve it.
   */
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (serverEnv.API_MOCKING !== 'enabled') return;

  await import('@/lib/mocks/node');
}
