/**
 * Small pieces every Route Handler repeats, said once (PD-01). A few older READ
 * routes still carry their own `no-store` literal; every write reads its body
 * through here.
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

/**
 * A request body as untrusted multipart form data (SEC-02). A body that is not
 * multipart, or arrives truncated, becomes `null` rather than a rejection — an
 * unguarded `request.formData()` throws, and a throw out of a Route Handler is a
 * 500 where the route's own answer is a 400 (ERR-04).
 */
export function readFormBody(request: Request): Promise<FormData | null> {
  return request.formData().then<FormData | null, null>(
    (form) => form,
    () => null,
  );
}

/**
 * The body length the caller DECLARED, or `null` when it declared none or wrote
 * something that is not a length. A declaration, not a measurement: it lets a
 * route refuse a body it would never accept before buffering any of it.
 */
export function declaredLength(request: Request): number | null {
  const raw = request.headers.get('content-length');
  if (raw === null || !/^\d+$/.test(raw)) return null;

  const length = Number.parseInt(raw, 10);
  return Number.isSafeInteger(length) ? length : null;
}
