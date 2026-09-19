import { readCartId } from '@/features/bag';
import { currentAccountKey } from '@/features/auth/server';
import { placeForCustomer } from '@/features/checkout';
import { placeOrderRequestSchema } from '@/features/checkout/contract';
import { getLocale } from '@/i18n';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * DATA-08 — §7.2, the one write that turns a bag into an order.
 *
 * It validates the shape and forwards. Every rule that decides whether the
 * order may exist — reservations still live, the total unchanged, the COD cap —
 * is applied by the transaction on the other side, because an interface that
 * checked any of them would be checking a copy (DATA-13).
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  await ensureMockServer();

  // SEC-08 — the write that places an order, so another origin is refused.
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: NO_STORE });

  const cartId = await readCartId();
  if (cartId === null) return new Response(null, { status: 404, headers: NO_STORE });

  // SEC-02: untrusted input, validated against the same schema Java is sent.
  const parsed = placeOrderRequestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return new Response(null, { status: 400, headers: NO_STORE });

  /* §28.3 — WHOSE order it is, from the session on this side and never from the
     body. A guest places one too (§28.2) and it carries no customer (§6.5); the
     token for reading it back is kept in this browser's cookie instead. */
  const result = await placeForCustomer(
    cartId,
    parsed.data,
    await getLocale(),
    await currentAccountKey(),
  );

  if (!result.ok) {
    /*
     * ERR-02 — two facts, kept apart for the page. A NOT_FOUND is the backend
     * ANSWERING that there is nothing here to place, so nothing was placed. Any
     * other failure — a timeout, the store unreachable, a reply that broke its
     * contract — leaves it unknown whether §7.2 committed, and the page must not
     * be told the order failed when it may exist.
     */
    if (result.error.kind === 'NOT_FOUND') {
      return new Response(null, { status: 404, headers: NO_STORE });
    }

    logApiError('api:checkout:place', result.error); // ERR-10
    return new Response(null, { status: 502, headers: NO_STORE });
  }

  /*
   * 200 for every outcome. `RESERVATION_EXPIRED` and `PRICE_CHANGED` are §7.2
   * doing what it is specified to do, and each carries what the customer needs
   * to see — the items that lapsed, or the total that moved.
   */
  return Response.json(result.value, { headers: NO_STORE });
}
