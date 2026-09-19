'use client';

import { useQuery } from '@tanstack/react-query';

import type { Locale } from '@/i18n/locales';
import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';

import { fetchSuggestions } from '../api/fetch-suggestions';
import { toggleFacetValue } from '../lib/query-changes';
import { EMPTY_QUERY, toQueryString } from '../lib/search-params';
import type { SearchRefinement, Suggestions } from '../schemas/search.schema';

export interface PanelSuggestions {
  /** The panel's whole question as a canonical query string, for "View all". */
  readonly queryString: string;
  readonly suggestions: { data: Suggestions | undefined; isPending: boolean };
}

/**
 * The search panel's one read: suggestions for the words plus whatever has been
 * narrowed.
 *
 * The question is built through the same helpers the address bar uses, so "View
 * all" can hand it straight to the results page and get the same answer (PD-01).
 */
export function usePanelSuggestions(
  term: string,
  applied: readonly SearchRefinement[],
  locale: Locale,
  isOpen: boolean,
): PanelSuggestions {
  const query = applied.reduce(
    (carried, facet) => toggleFacetValue(carried, facet.key, facet.value),
    { ...EMPTY_QUERY, term },
  );
  const queryString = toQueryString(query);

  const suggestions = useQuery({
    // The whole query, so narrowing to Boski is its own cache entry rather than a
    // stale hit on the unfiltered term.
    queryKey: queryKeys.catalogue.suggestions(queryString, locale),
    queryFn: ({ signal }) => unwrap(fetchSuggestions(query, locale, signal)),
    // Enabled for an EMPTY term too: the backend answers a blank box with what it
    // wants merchandised.
    enabled: isOpen,
    staleTime: 60 * 1000,
    retry: false,
  });

  return { queryString, suggestions };
}
