import type { Instrumentation } from 'next';

/**
 * F-08 — server-side error tracking (TD-11). Next calls `register` once when a
 * server instance starts, and `onRequestError` for every error it catches while
 * serving a request (Server Components, Route Handlers, Server Actions, proxy).
 *
 * The tracker is loaded only on the Node.js runtime and only inside these
 * functions, so nothing here reaches the Edge runtime or the browser, and a
 * deployment with no `SENTRY_DSN` loads the SDK and does nothing with it.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { initErrorTracking } = await import('./src/lib/observability/error-tracking');
  initErrorTracking();
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { captureRequestError } = await import('./src/lib/observability/error-tracking');
  captureRequestError(error, request, context);
};
