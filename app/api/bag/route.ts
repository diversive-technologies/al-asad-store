import { addForCustomer, fetchBagSummary, readCartId } from '@/features/bag';
import { addToBagRequestSchema } from '@/features/bag/contract';
import { readProfileOwner } from '@/features/made-to-measure';
import { getLocale } from '@/i18n';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { withMockSession } from '@/lib/mocks/session';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * DATA-08 — the bag's BFF, and the third in the project.
 *
 * It exists for two reasons rather than one. `apiRequest` is `server-only`, as
 * with the other two — but this route also ATTACHES the cart id from an
 * httpOnly cookie, which is the textbook thing a BFF is for: the browser asks
 * for "my bag" and never learns, or is able to forge, which bag that is.
 *
 * STRUCT-02: it composes and nothing else. Reservation, pricing and the promo
 * table are all behind `apiRequest`, in Java.
 */
export const dynamic = 'force-dynamic';

/**
 * What this route answers a browser that has no bag: `204`, with no body. The
 * browser reads that as the empty bag (`EMPTY_BAG`, in `fetchBag`) without a
 * body to hold to a schema — and so without downloading one, on the read the
 * header makes on every page (PERF-10).
 */
function noBag(): Response {
  return new Response(null, { status: 204, headers: NO_STORE });
}

/** §16 `summary(cart)`. A read: it changes nothing, so SEC-08 does not apply. */
export async function GET(): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own
  // module context or the first request after a hot reload hits a real socket.
  await ensureMockServer();

  const cartId = await readCartId();

  /*
   * No cookie means this browser has never added anything. That is an empty
   * bag, not an error and not a reason to create a cart — a visitor who only
   * browses should leave no rows behind them.
   */
  if (cartId === null) return noBag();

  const result = await fetchBagSummary(cartId, await getLocale());

  if (!result.ok) {
    /*
     * A 404 means the cookie names a cart the backend does not have — swept,
     * or from a previous fixture. The customer's bag really is empty, and
     * saying so is better than an error they cannot act on.
     */
    if (result.error.kind === 'NOT_FOUND') return noBag();

    logApiError('api:bag:get', result.error); // ERR-10
    return new Response(null, { status: 502, headers: NO_STORE });
  }

  return Response.json(result.value, { headers: NO_STORE });
}

/** §16 `addItem` — the write that creates the cart if there is not one yet. */
async function postHandler(request: Request): Promise<Response> {
  await ensureMockServer();

  // SEC-08 — a write that can create a cart and replace the cookie naming one.
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: NO_STORE });

  // SEC-02: the request body is untrusted, and is validated against the same
  // schema the backend will be sent rather than forwarded blind.
  const parsed = addToBagRequestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return new Response(null, { status: 400, headers: NO_STORE });

  /*
   * §34 — a made-to-measure add names a saved profile, so the owner is resolved
   * HERE, from the session or the device cookie, and attached as a header. A
   * READ of the owner, deliberately: `resolveProfileOwner` would mint a device
   * token, and adding to a bag is not a reason to hand a browser one.
   */
  const owner = parsed.data.madeToMeasureProfileId === undefined ? null : await readProfileOwner();
  const ownerHeader = owner === null ? undefined : `${owner.keptWith}:${owner.key}`;

  // A cart the backend lost is replaced inside, once it is confirmed gone.
  const result = await addForCustomer(parsed.data, await getLocale(), ownerHeader);

  if (!result.ok) {
    logApiError('api:bag:post', result.error); // ERR-10
    return new Response(null, { status: 502, headers: NO_STORE });
  }

  /*
   * 200 whichever way it went. `Unavailable(piece)` is an expected answer the
   * panel renders as "Kameez — L is gone", not a failure of this request
   * (§7.1), and so is a refused set of measurements or a refused selection; the
   * union in the body carries which. None of them is a NOT_FOUND, which is what
   * keeps a refusal from being mistaken for a dead cart.
   */
  return Response.json(result.value, { headers: NO_STORE });
}

/*
 * D1 serverless — the cookie is written after the handler has answered, so
 * the rows it carries are the ones this request left behind.
 */
export const POST = withMockSession(postHandler);
