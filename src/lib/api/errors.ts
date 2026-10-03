import type { $ZodIssue } from 'zod/v4/core';

/** ERR-03 — error kinds are a discriminated union, declared once. */
export type ApiError =
  | { kind: 'NETWORK'; message: string }
  | { kind: 'TIMEOUT'; message: string }
  | { kind: 'UNAUTHORIZED'; message: string }
  | { kind: 'FORBIDDEN'; message: string }
  | { kind: 'NOT_FOUND'; message: string; resource?: string }
  | { kind: 'VALIDATION'; message: string; fieldErrors: Record<string, string[]> }
  | { kind: 'CONFLICT'; message: string }
  /**
   * ERR-03 — 429. A distinct kind because §11 rate-limits failed sign-in
   * attempts "per identifier and per source", and a customer who has been
   * locked out needs to be told to wait rather than shown "wrong password"
   * again and again while they try harder.
   *
   * F-09 — classified HERE, once, from the status. `retryAfterSeconds` is the
   * backend's `Retry-After` when it sent a usable one; the BFF passes it on to the
   * browser unchanged, and no surface needs to read it to say "wait".
   */
  | { kind: 'RATE_LIMITED'; message: string; retryAfterSeconds?: number }
  | { kind: 'CONTRACT_VIOLATION'; message: string; issues: readonly $ZodIssue[]; path: string }
  | { kind: 'SERVER'; message: string; status: number };

/**
 * Converts a rejected `fetch` into an ApiError.
 * ERR-08: the caught value is `unknown` and is narrowed before use.
 */
export function toApiError(cause: unknown): ApiError {
  if (cause instanceof DOMException && cause.name === 'TimeoutError') {
    return { kind: 'TIMEOUT', message: 'The request to the store timed out.' };
  }
  if (cause instanceof DOMException && cause.name === 'AbortError') {
    return { kind: 'TIMEOUT', message: 'The request to the store was aborted.' };
  }
  return { kind: 'NETWORK', message: 'The store could not be reached.' };
}

/**
 * A `Retry-After` header as a whole number of seconds, or `null` when it is
 * absent or not one. Only the delta-seconds form is read: Java sends seconds
 * (A-03), and an HTTP date would need a clock this function does not have. Capped
 * at a day, so a hostile or broken value cannot park a customer for ever.
 */
export function retryAfterSecondsOf(header: string | null): number | null {
  if (header === null || !/^\d{1,9}$/.test(header.trim())) return null;

  const seconds = Number.parseInt(header.trim(), 10);
  return seconds >= 1 ? Math.min(seconds, 86_400) : null;
}

/**
 * Maps an HTTP status onto the error union.
 *
 * ERR-11: these messages are diagnostic, for logs and for branching. User-facing
 * copy is resolved from SSOT-07 by whoever renders the failure, never from here.
 */
export function fromHttpStatus(response: Response): ApiError {
  switch (response.status) {
    case 401:
      return { kind: 'UNAUTHORIZED', message: 'Authentication is required.' };
    case 403:
      return { kind: 'FORBIDDEN', message: 'This action is not permitted.' };
    case 404:
      return { kind: 'NOT_FOUND', message: 'The requested resource does not exist.' };
    case 409:
      return { kind: 'CONFLICT', message: 'The resource changed before the request completed.' };
    case 429: {
      const retryAfterSeconds = retryAfterSecondsOf(response.headers.get('retry-after'));
      return {
        kind: 'RATE_LIMITED',
        message: 'Too many attempts were made.',
        ...(retryAfterSeconds === null ? {} : { retryAfterSeconds }),
      };
    }
    case 422:
      return { kind: 'VALIDATION', message: 'The submitted data was rejected.', fieldErrors: {} };
    default:
      return {
        kind: 'SERVER',
        message: 'The store responded with an error.',
        status: response.status,
      };
  }
}
