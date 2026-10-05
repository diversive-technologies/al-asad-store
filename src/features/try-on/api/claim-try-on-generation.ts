import 'server-only';

import { z } from 'zod';

import { apiRequest } from '@/lib/api/client';
import { clientAddressHeader } from '@/lib/api/client-address';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ProductId } from '@/lib/domain/ids';
import { logApiError } from '@/lib/utils/log';
import { NO_STORE, rateLimitedResponse } from '@/lib/utils/route';

import type { TryOnResult } from '../schemas/try-on.schema';

/**
 * §24 — may this caller spend a generation? Java decides (T-02).
 *
 * A generation costs metered money, so it is counted where every storefront
 * instance can see the same number: Java keeps a per-address hourly limit and a
 * daily cap (T-01). The storefront used to count in its own process memory, which
 * N serverless instances multiplied by N and a cold start forgot.
 *
 * It lives beside the module rather than in `app/` because STRUCT-02 keeps
 * decisions out of route files: the route composes, and "may this caller spend a
 * generation" is the module's rule, not the router's.
 *
 * ## The order of the work, which is the point
 *
 * The route asks BEFORE it reads the body and before the provider is reached, so
 * a refusal is the cheapest thing it can do: nothing is buffered, nothing is
 * decoded, and the model is never called. The claim is recorded before the
 * generation, not after — a generation that fails still costs a provider call,
 * and a count that only followed successes would let a failing request be retried
 * without limit.
 *
 * ## Unreachable means NO
 *
 * Java being down, or refusing this server's credentials, or answering something
 * that is not the contract, REFUSES the generation. It never allows one: the claim
 * is the only thing between the store and a bill, so a check that cannot be made
 * is not passed. The customer is told it is unavailable, in the contract's own
 * words, and the failure is logged.
 */

/**
 * Java's answer to a claim that is allowed. `claimId` is Java's own record of the
 * claim; nothing here needs it yet, and it is parsed so a reply that is not the
 * contract is a refusal rather than a guess.
 */
const claimAllowedSchema = z.object({
  verdict: z.literal('ALLOWED'),
  claimId: z.string().min(1),
});

/**
 * What to tell a refused caller when Java sent no `Retry-After` of its own: the
 * old in-process budget's one-hour window, which the customer's panel was already
 * written around.
 */
export const DEFAULT_RETRY_AFTER_SECONDS = 3600;

/** What the panel shows when the claim could not be made: the contract's own unavailable. */
const UNAVAILABLE: TryOnResult = { status: 'UNAVAILABLE', reason: 'PROVIDER_FAILED' };

/**
 * Ask Java for one generation: a `Response` when the request is refused, and
 * `null` when it may proceed.
 *
 * Both of Java's refusals — this address has had its hour's share, and the whole
 * store has had its day's — answer the same way (429 and `Retry-After`, the
 * body empty). The customer is told to wait either way, and which ceiling they
 * met is the store's business rather than theirs (ERR-11, SEC-07).
 *
 * The address travels as `x-client-ip`, taken from this request (F-02). No
 * photograph and nothing identifying the customer is sent.
 */
export async function claimTryOnGeneration(
  request: Request,
  productId: ProductId,
): Promise<Response | null> {
  const claim = await apiRequest({
    path: ENDPOINTS.tryOn.claim,
    schema: claimAllowedSchema,
    method: 'POST',
    body: { productId },
    headers: clientAddressHeader(request),
    // DATA-09: a write that counts, so there is nothing to cache.
    next: { revalidate: 0 },
  });

  if (claim.ok) return null;

  if (claim.error.kind === 'RATE_LIMITED') {
    return rateLimitedResponse(claim.error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS);
  }

  // ERR-10 — once, at the boundary that turns it into an answer.
  logApiError('api:try-on:claim', claim.error);
  return Response.json(UNAVAILABLE, { headers: NO_STORE });
}
