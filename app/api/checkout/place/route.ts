import { readCartId } from '@/features/bag';
import { placeOrder } from '@/features/checkout';
import { placeOrderRequestSchema } from '@/features/checkout/contract';
import { getLocale } from '@/i18n';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';

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

  const cartId = await readCartId();
  if (cartId === null) return new Response(null, { status: 404 });

  const body: unknown = await request.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  // SEC-02: untrusted input, validated against the same schema Java is sent.
  const parsed = placeOrderRequestSchema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });

  const result = await placeOrder(cartId, parsed.data, await getLocale());

  if (!result.ok) {
    logApiError('api:checkout:place', result.error); // ERR-10
    return new Response(null, { status: 502 });
  }

  /*
   * 200 for every outcome. `RESERVATION_EXPIRED` and `PRICE_CHANGED` are §7.2
   * doing what it is specified to do, and each carries what the customer needs
   * to see — the items that lapsed, or the total that moved.
   */
  return Response.json(result.value, { headers: { 'Cache-Control': 'no-store' } });
}
