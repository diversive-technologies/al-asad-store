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
