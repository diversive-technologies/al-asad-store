import type { ApiError } from '@/lib/api/errors';
import { reportToTracker } from '@/lib/observability/error-reporter';

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
   * F-08: the tracker gets the same words, masked of any email or mobile on the
   * way. A contract violation's failing keys go with it, so it can be grouped by
   * the field that broke — `code` and `path` only, as below (SEC-10).
   */
  const issues =
    error.kind === 'CONTRACT_VIOLATION'
      ? ` (${error.path}: ${error.issues.map((issue) => `${issue.path.join('.') || '(root)'} ${issue.code}`).join(', ')})`
      : '';
  reportToTracker('error', context, `${error.kind}: ${error.message}${issues}`);

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

/**
 * ERR-10 — a problem found in content that PARSED but cannot be used as it
 * stands: a served mark that falls off its drawing, a point with no wording.
 * Logged once by the boundary that decided what to render instead. `detail`
 * names ids and reasons only — never a customer's data (SEC-10).
 */
export function logContentIssue(context: string, detail: string): void {
  console.error(`[${context}] ${detail}`);
  // F-08: a content problem is a warning to the tracker — the page still rendered.
  reportToTracker('warning', context, detail);
}

/**
 * ERR-10 — an external provider failed, and the customer was told so in general
 * terms (ERR-11) by an outcome that is not an `ApiError`, so nothing else would
 * record it. Without this a revoked key, an exhausted quota and a refused
 * photograph all looked alike on a deployment, and none of them left a line.
 * `detail` is status codes and enum values only (SEC-10).
 */
export function logProviderFailure(context: string, detail: string): void {
  console.error(`[${context}] ${detail}`);
  // F-08: a failing provider is an error to the tracker, masked on the way.
  reportToTracker('error', context, detail);
}
