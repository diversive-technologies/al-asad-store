import { parseCatalogueQuery, suggest } from '@/features/catalogue';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';

/**
 * DATA-08 — a BFF, not a second backend.
 *
 * It exists for exactly one reason: `apiRequest` is `server-only`, and the
 * type-ahead has to run from the browser on every keystroke. So this proxies,
 * and does nothing else. There is no ranking, no filtering and no merging here —
 * all of that is Java's, and reimplementing any of it would be DATA-13.
 *
 * CMP-03: Route Handlers require NAMED method exports; a default export here is
 * not a route at all.
 */

/** NEXT: keystroke-scoped and user-specific, so never cached at the edge. */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  /*
   * D1 — the root layout arms the mock layer per request, but a Route Handler
   * never renders the layout, so it has to arm its own module context. Without
   * this the first suggestion request after a hot reload reaches a real socket
   * and is refused.
   */
  await ensureMockServer();

  const url = new URL(request.url);
  const requestedLocale = url.searchParams.get('locale');
  const locale = isLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  /*
   * SEC-02 — query parameters are untrusted input. `parseCatalogueQuery` is the
   * same total, never-throwing parser the listing routes use, so a hand-edited
   * address produces a valid query rather than an error, and the panel and the
   * results page cannot disagree about what a parameter means (PD-01).
   *
   * The whole query travels, not just the term: the panel filters in place, so
   * narrowing it to "Boski" has to reach the backend as a filter.
   */
  const query = parseCatalogueQuery(Object.fromEntries(url.searchParams.entries()));

  // ERR-02 / DATA-03a: a Route Handler consumes the Result as a value. `unwrap`
  // belongs only inside a queryFn.
  const result = await suggest(query, locale);

  if (!result.ok) {
    logApiError('api:suggest', result.error); // ERR-10, logged once at the boundary

    /*
     * Section 15: browsing must never depend on a secondary system being
     * healthy. An unreachable index costs the suggestions, not the search box —
     * the reader can still type and submit. So this is an empty result, not a
     * 5xx, and certainly not the upstream error text (ERR-11, SEC-07).
     */
    return Response.json({ terms: [], products: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  return Response.json(result.value, { headers: { 'Cache-Control': 'no-store' } });
}
