import type { ApiError } from '@/lib/api/errors';

/**
 * ERR-10 — errors are logged once, at the boundary that handles them.
 * Log-and-rethrow produces duplicate noise and is PROHIBITED, so `apiRequest`
 * stays silent and the consumer that turns a failed Result into a rendered
 * state calls this.
 *
 * PD-01: one place to swap for a structured logger later, rather than `console`
 * scattered across route files.
 */
export function logApiError(context: string, error: ApiError): void {
  // SEC-10: the ApiError union carries no customer data, credentials or
  // response bodies — only a kind, a diagnostic message and a request path.
  console.error(`[${context}] ${error.kind}: ${error.message}`);
}
