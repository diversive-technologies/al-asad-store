import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import type { Result } from '@/lib/result';

import { toSearchParams } from '../lib/search-params';
import { suggestionsSchema, type CatalogueQuery, type Suggestions } from '../schemas/search.schema';

/**
 * DATA-04 — section 15 `suggest(partial)`.
 *
 * Reached from the client through a BFF route (DATA-08) rather than directly,
 * because `apiRequest` is `server-only`. Section 30.1 budgets this path at under
 * 100ms, so it is deliberately the leanest read in the feature.
 */
export function suggest(
  query: CatalogueQuery,
  locale: Locale,
): Promise<Result<Suggestions, ApiError>> {
  /*
   * The WHOLE query, not just the term.
   *
   * The search panel filters in place: choosing "Boski" narrows the products
   * inside it rather than navigating away, so the next request has to carry the
   * facets as well as the words. `toSearchParams` is the same canonical
   * serialiser the address bar uses, so a panel narrowed to boski and the
   * results page for that filter ask the backend the identical question.
   */
  const params = Object.fromEntries(toSearchParams(query).entries());

  /*
   * An empty term is FORWARDED, and used to be short-circuited here.
   *
   * The reasoning was sound while the type-ahead was a dropdown: a round trip
   * for an empty box spent the §30.1 budget on nothing. The search panel now
   * opens before anyone types, and what fills it — the trending terms and the
   * merchandised products — is the backend's answer to exactly that empty
   * query. Deciding here that the answer is nothing would be the frontend
   * overruling it (DATA-13).
   */
  return apiRequest({
    path: ENDPOINTS.catalogue.suggest,
    schema: suggestionsSchema,
    searchParams: { ...params, locale },
    /*
     * DATA-09: uncached here on purpose. Suggestions are keystroke-scoped and
     * short-lived; the caching that matters for them is TanStack Query on the
     * client, where the same partial term is typed and re-typed.
     */
    next: { revalidate: 0 },
  });
}
