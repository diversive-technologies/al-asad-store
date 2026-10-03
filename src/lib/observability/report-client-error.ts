import { ROUTES } from '@/config/routes';

/**
 * F-08 — an error boundary tells the server it caught something.
 *
 * `sendBeacon` rather than `fetch`: it is made for exactly this, survives the page
 * going away, and never rejects into the boundary that called it. Deliberately tiny
 * (the root boundaries load with every page — PERF-10) and deliberately silent:
 * reporting must never be able to make the failure it reports worse.
 *
 * Once per error: a boundary can run its effect again for the same error (Strict
 * Mode, a re-render), and the server's own limit is five a minute.
 */
const reported = new WeakSet<object>();

export function reportClientError(error: Error & { digest?: string }): void {
  if (reported.has(error)) return;
  reported.add(error);

  // ERR-05(1): a browser without `sendBeacon`, or one that refuses it, is not an error here.
  try {
    const body = JSON.stringify({
      // The message only — never the stack, which holds file paths and nothing the customer typed.
      message: error.message.slice(0, 500),
      digest: error.digest ?? null,
      path: window.location.pathname,
    });
    navigator.sendBeacon(ROUTES.api.clientError, new Blob([body], { type: 'application/json' }));
  } catch {
    // Deliberately empty.
  }
}
