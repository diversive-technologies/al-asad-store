import { addItem, clearCartId, ensureCartId, fetchBagSummary, readCartId } from '@/features/bag';
import { EMPTY_BAG, addToBagRequestSchema } from '@/features/bag/contract';
import { getLocale } from '@/i18n';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';

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

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** §16 `summary(cart)`. */
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
  if (cartId === null) return Response.json(EMPTY_BAG, { headers: NO_STORE });

  const result = await fetchBagSummary(cartId, await getLocale());

  if (!result.ok) {
    /*
     * A 404 means the cookie names a cart the backend does not have — swept,
     * or from a previous fixture. The customer's bag really is empty, and
     * saying so is better than an error they cannot act on.
     */
    if (result.error.kind === 'NOT_FOUND') {
      return Response.json(EMPTY_BAG, { headers: NO_STORE });
    }

    logApiError('api:bag:get', result.error); // ERR-10
    return new Response(null, { status: 502 });
  }

  return Response.json(result.value, { headers: NO_STORE });
}

/** §16 `addItem` — the write that creates the cart if there is not one yet. */
export async function POST(request: Request): Promise<Response> {
  await ensureMockServer();

  const body: unknown = await request.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  // SEC-02: the request body is untrusted, and is validated against the same
  // schema the backend will be sent rather than forwarded blind.
  const parsed = addToBagRequestSchema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });

  const cartId = await ensureCartId();
  if (!cartId.ok) {
    logApiError('api:bag:post', cartId.error);
    return new Response(null, { status: 502 });
  }

  const locale = await getLocale();
  let result = await addItem(cartId.value, parsed.data, locale);

  /*
   * The cookie can name a cart the backend no longer has: swept for age, lost
   * to a restart, or issued by a different environment. The GET above already
   * treats that as an empty bag; a WRITE has to do more than that, because
   * otherwise the customer is stuck — every add fails, forever, and clearing
   * cookies is not something a shopper knows to do.
   *
   * So: discard the dead id, take a fresh cart, and retry ONCE. Bounded on
   * purpose — a second NOT_FOUND means something is wrong with the backend
   * rather than with this cookie, and retrying again would just loop.
   */
  if (!result.ok && result.error.kind === 'NOT_FOUND') {
    await clearCartId();

    const replacement = await ensureCartId();
    if (!replacement.ok) {
      logApiError('api:bag:post', replacement.error);
      return new Response(null, { status: 502 });
    }

    result = await addItem(replacement.value, parsed.data, locale);
  }

  if (!result.ok) {
    logApiError('api:bag:post', result.error);
    return new Response(null, { status: 502 });
  }

  /*
   * 200 whichever way it went. `Unavailable(piece)` is an expected answer the
   * panel renders as "Kameez — L is gone", not a failure of this request
   * (§7.1); the union in the body carries which.
   */
  return Response.json(result.value, { headers: NO_STORE });
}
