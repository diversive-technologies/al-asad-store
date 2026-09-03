/**
 * ERR-02 — THE result type. Expected failures are values, not exceptions.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

/** Maps the success channel, leaving the error channel untouched. */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/**
 * DATA-03a / ERR-05(4): the ONLY sanctioned Result to rejected-promise adapter.
 * TanStack Query detects failure exclusively via a rejected promise, so a
 * `queryFn`/`mutationFn` must reject. Use nowhere else.
 */
export async function unwrap<T, E>(promise: Promise<Result<T, E>>): Promise<T> {
  const result = await promise;
  if (result.ok) return result.value;
  throw result.error;
}

/** TS-07 — makes an unhandled union member a compile error. */
export function assertNever(value: never): never {
  // ERR-06: a violated internal invariant indicates a bug, not a business state.
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}
