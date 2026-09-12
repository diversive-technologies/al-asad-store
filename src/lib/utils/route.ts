/**
 * Small pieces every Route Handler repeats, said once (PD-01). The older BFF
 * routes still carry their own copies; moving them here is offered separately
 * rather than folded into unrelated work (BOT-04).
 */

/** A response nothing between the store and the browser may cache. */
export const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/**
 * A request body as untrusted JSON (SEC-02). A body that is not JSON becomes
 * `null`, never a throw (ERR-05), and is then refused by the schema that follows.
 */
export function readJsonBody(request: Request): Promise<unknown> {
  return request.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );
}
