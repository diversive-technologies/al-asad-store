import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { ok, type Result } from '@/lib/result';

import { suggestionsSchema, type Suggestions } from '../schemas/search.schema';

const EMPTY_SUGGESTIONS: Suggestions = { terms: [], products: [] };

/**
 * DATA-04 — section 15 `suggest(partial)`.
 *
 * Reached from the client through a BFF route (DATA-08) rather than directly,
 * because `apiRequest` is `server-only`. Section 30.1 budgets this path at under
 * 100ms, so it is deliberately the leanest read in the feature.
 */
export function suggest(term: string, locale: Locale): Promise<Result<Suggestions, ApiError>> {
  const trimmed = term.trim();

  // A round trip for an empty box would spend the 100ms budget on nothing.
  if (trimmed.length === 0) return Promise.resolve(ok(EMPTY_SUGGESTIONS));

  return apiRequest({
    path: ENDPOINTS.catalogue.suggest,
    schema: suggestionsSchema,
    searchParams: { q: trimmed, locale },
    /*
     * DATA-09: uncached here on purpose. Suggestions are keystroke-scoped and
     * short-lived; the caching that matters for them is TanStack Query on the
     * client, where the same partial term is typed and re-typed.
     */
    next: { revalidate: 0 },
  });
}
