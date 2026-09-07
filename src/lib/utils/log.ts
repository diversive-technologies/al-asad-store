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

  /*
   * A contract violation without its issues is close to undiagnosable: the
   * message names the schema but not the field, so it reads as "the backend is
   * wrong somewhere" and sends whoever is reading it to the wrong place. The
   * path and the failing keys cost one line and turn it into an address.
   *
   * SEC-10: `code`, `path` and `message` only. A Zod issue can carry the value
   * it rejected, and that value is a response body — it does not go in a log.
   */
  if (error.kind === 'CONTRACT_VIOLATION') {
    for (const issue of error.issues) {
      console.error(`  ${error.path} → ${issue.path.join('.') || '(root)'}: ${issue.code}`);
    }
  }
}
