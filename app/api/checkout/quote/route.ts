import { readCartId } from '@/features/bag';
import { fetchQuote } from '@/features/checkout';
import { getLocale } from '@/i18n';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';

/**
 * DATA-08 — §17 `quote`, behind the same cookie the bag uses.
 *
 * STRUCT-02: it composes. The COD cap, the delivery charges and the gift charge
 * are all decided on the far side of `apiRequest`, in Java.
 */
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function GET(request: Request): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own
  // module context or the first request after a hot reload hits a real socket.
  await ensureMockServer();

  const cartId = await readCartId();
  // No cart means nothing to quote. Not an error — there is simply no checkout.
  if (cartId === null) return new Response(null, { status: 404 });

  const url = new URL(request.url);
  const result = await fetchQuote(
    cartId,
    url.searchParams.get('deliveryOptionId') ?? '',
    url.searchParams.get('isGift') === 'true',
    await getLocale(),
  );

  if (!result.ok) {
    // An empty bag answers 404 too, and that is the honest status for it.
    if (result.error.kind === 'NOT_FOUND') return new Response(null, { status: 404 });

    logApiError('api:checkout:quote', result.error); // ERR-10
    return new Response(null, { status: 502 });
  }

  return Response.json(result.value, { headers: NO_STORE });
}
