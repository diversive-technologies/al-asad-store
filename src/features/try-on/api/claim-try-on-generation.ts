import 'server-only';

import { NO_STORE } from '@/lib/utils/route';

import { claimGeneration, retryAfterSeconds } from './try-on-budget-store';

/**
 * §24 — the budget as the Route Handler sees it: a `Response` when the request
 * is refused, and `null` when it may proceed.
 *
 * It lives beside the store rather than in `app/` because STRUCT-02 keeps
 * decisions out of route files; the route composes, and "may this caller spend
 * a generation" is the module's rule, not the router's.
 */

/**
 * Which bucket a caller counts against.
 *
 * The forwarded address, taking the FIRST entry: `x-forwarded-for` is a chain
 * appended to by each proxy, so the left-most is the client and everything
 * after it is infrastructure. Trusting the last would put every visitor behind
 * one proxy into the same bucket, and trusting a caller-supplied header on a
 * host that sets none would let anyone mint a fresh budget per request — so a
 * missing header collapses to ONE shared bucket rather than to a unique one.
 *
 * It is a bucket, never an identity: not logged, not stored beyond the window,
 * not joined to a customer (§30.4).
 */
function visitorKeyOf(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();

  return first !== undefined && first.length > 0 ? first : 'unattributed';
}

/**
 * Spend one generation, or answer 429.
 *
 * Both refusals answer the same way. The customer is told to wait either way,
 * and which ceiling they met is the store's business rather than theirs
 * (ERR-11, SEC-07) — the body is empty, as it is everywhere else on this route.
 */
export function claimTryOnGeneration(request: Request): Response | null {
  if (claimGeneration(visitorKeyOf(request)) === 'ALLOWED') return null;

  return new Response(null, {
    status: 429,
    headers: { ...NO_STORE, 'Retry-After': String(retryAfterSeconds()) },
  });
}
