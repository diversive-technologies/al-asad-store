import { fetchProduct, fetchProductAvailability, unifiedSizesFor } from '@/features/catalogue';
import { getLocale } from '@/i18n';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';

/**
 * DATA-08 — the card's quick add, and a textbook AGGREGATING BFF.
 *
 * It joins two backend reads the browser would otherwise make itself: the
 * product (for its pieces and their size labels) and the live per-size
 * availability overlay. §8.2 keeps those separate on the server for good
 * reason — one caches for hours, the other not at all — and this route is where
 * they meet, so a card opens its size tray with one request rather than two.
 *
 * The reduction to unified sizes is `unifiedSizesFor`, a pure module shared
 * with nothing else that could disagree with it.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own
  // module context or the first request after a hot reload hits a real socket.
  await ensureMockServer();

  const slug = new URL(request.url).searchParams.get('slug') ?? '';
  if (slug.length === 0) return new Response(null, { status: 400 });

  const product = await fetchProduct(slug, await getLocale());

  if (!product.ok) {
    logApiError('api:quick-add', product.error); // ERR-10
    return new Response(null, { status: 502 });
  }

  if (product.value === null) return new Response(null, { status: 404 });

  /*
   * §30.2 — availability is allowed to fail. The tray then offers every size
   * and lets the §7.1 transaction be the judge, which is the correct order of
   * authority: a missing overlay must not invent a sold-out state.
   */
  const availability = await fetchProductAvailability(product.value.id);
  if (!availability.ok) logApiError('api:quick-add:availability', availability.error);

  const offer = unifiedSizesFor(product.value, availability.ok ? availability.value : null);

  return Response.json(
    { productId: product.value.id, ...offer },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
