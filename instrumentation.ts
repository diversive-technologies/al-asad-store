import { serverEnv } from '@/config/env.server';

/**
 * D1 — arms the mock layer when the Next.js server boots, so the very first
 * request is already intercepted.
 *
 * It is not the only place this happens: the root layout re-asserts it per
 * request, because a hot reload replaces the module context and this hook does
 * not run again. See `src/lib/mocks/ensure.ts`.
 */
export async function register(): Promise<void> {
  /*
   * SSOT-03 exception, stated (§22-J): `process.env.NEXT_RUNTIME` is read
   * literally rather than through `serverEnv`.
   *
   * It is not configuration — it is the token Next substitutes at build time so
   * the bundler can statically eliminate this branch. Read through a validated
   * object it becomes a runtime value, the branch survives into the edge
   * bundle, and resolution of `msw/node` then fails there: the export map of
   * `@mswjs/interceptors` sets `"browser": null` for its Node interceptors.
   */
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (serverEnv.API_MOCKING !== 'disabled') {
    const { ensureMockServer } = await import('@/lib/mocks/ensure');
    await ensureMockServer();
  }
}
