/**
 * SEC-08 — same-origin verification for mutating Route Handlers.
 *
 * A Route Handler is not covered by the CSRF protection Next.js applies to
 * Server Actions, so a state-changing or resource-spending POST has to check for
 * itself. The `Origin` header is the check: browsers set it on every
 * cross-origin request and script cannot forge it, which is exactly the attack
 * this is for.
 *
 * A request with NO `Origin` is allowed. Browsers omit it on same-origin
 * navigations and on ordinary server-to-server calls, so refusing on absence
 * would break both while stopping nothing — the forged-request case always
 * carries an origin, and carries the attacker's.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin === null) return true;

  return origin === new URL(request.url).origin;
}
