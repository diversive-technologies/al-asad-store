import { fetchAvailability, fetchProductsByIds, mergeAvailability } from '@/features/catalogue';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';

/**
 * DATA-08 — a BFF that proxies and AGGREGATES, and does nothing else.
 *
 * It exists because the saved-items list lives in the browser's own storage
 * (see `useWishlist`), so the request can only start on the client — and
 * `apiRequest` is `server-only`.
 *
 * The aggregation is the second reason it earns its place: a saved list needs
 * the cached product projection AND the live availability overlay, which
 * architecture 8.2 keeps deliberately apart. Merging them here costs the
 * browser one request instead of two, and the merge is the same
 * `mergeAvailability` the catalogue listing uses, so the two surfaces cannot
 * disagree about what "sold out" means (PD-01).
 *
 * No ranking, no filtering, no business rule. All of that is Java's (DATA-13).
 *
 * CMP-03: Route Handlers require NAMED method exports.
 */

/** The list is per-reader and carries live stock, so it is never cached. */
export const dynamic = 'force-dynamic';

/**
 * A ceiling on how many ids one request may ask about.
 *
 * SEC-02 — the ids arrive from the browser, so the length is untrusted input.
 * Without a bound, a hand-written URL could ask for an arbitrarily large join
 * on the backend. 100 is far above any real saved list.
 */
const MAX_IDS = 100;

export async function GET(request: Request): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own
  // module context or the first request after a hot reload hits a real socket.
  await ensureMockServer();

  const url = new URL(request.url);
  const requestedLocale = url.searchParams.get('locale');
  const locale = isLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  // SEC-02: query parameters are untrusted input, validated rather than cast.
  const ids = (url.searchParams.get('ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .slice(0, MAX_IDS);

  if (ids.length === 0) {
    return Response.json({ entries: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const products = await fetchProductsByIds(ids, locale);

  if (!products.ok) {
    logApiError('api:products', products.error); // ERR-10, logged once at the boundary
    // ERR-11 / SEC-07: an authored status, never the upstream error text.
    return new Response(null, { status: 502 });
  }

  /*
   * Section 30.2: a degraded dependency costs the stock badges, not the page.
   * So a failed availability read is logged and dropped rather than failing the
   * request — every card then reports availability as unknown rather than
   * guessing, which is what `mergeAvailability` does with an empty list.
   */
  const availability = await fetchAvailability(products.value.map((product) => product.id));

  if (!availability.ok) logApiError('api:products:availability', availability.error);

  return Response.json(
    { entries: mergeAvailability(products.value, availability.ok ? availability.value : []) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
