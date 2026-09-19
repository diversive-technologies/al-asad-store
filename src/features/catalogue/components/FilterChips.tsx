import Link from 'next/link';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';
import { X } from '@/lib/vendor/icons';

import {
  listActiveFilters,
  removeActiveFilter,
  type ServedCollection,
} from '../lib/active-filters';
import { activeFilterLabel } from '../lib/filter-labels';
import { clearFilters } from '../lib/query-changes';
import { toQueryString } from '../lib/search-params';
import type { CatalogueQuery, SearchFacets } from '../schemas/search.schema';

export interface FilterChipsProps {
  query: CatalogueQuery;
  facets: SearchFacets | null;
  /** The collection the backend served, which names the collection chip. */
  collection: ServedCollection;
  basePath: string;
  locale: Locale;
  messages: Messages;
}

/**
 * Section 28.1's removable chips and Clear all.
 *
 * Both are links, matching the panel: removing a filter is navigation to a
 * narrower URL, not a mutation. "Clear all" keeps the search term — dropping
 * filters is not abandoning the search — which `clearFilters` already decides.
 */
export function FilterChips({
  query,
  facets,
  collection,
  basePath,
  locale,
  messages,
}: FilterChipsProps) {
  const chips = listActiveFilters(query, facets, collection);
  if (chips.length === 0) return null;

  const t = messages.catalogue;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* A11Y-01: a real list with a name, not a bare row of divs. */}
      <ul aria-label={t.activeFiltersLabel} className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => {
          const label = activeFilterLabel(chip, locale, messages);

          return (
            <li key={chip.id}>
              <Link
                href={`${basePath}${toQueryString(removeActiveFilter(query, chip))}`}
                /*
                 * WCAG 2.5.3: the accessible name contains the visible text, so
                 * "Remove Lawn" is a valid name for a chip reading "Lawn".
                 */
                aria-label={formatTemplate(t.removeFilter, { label })}
                className="rounded-pill border-border bg-surface-muted hover:bg-surface-strong focus-visible:ring-brand-500 text-fg inline-flex items-center gap-1.5 border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <bdi>{label}</bdi>
                <X className="text-fg-muted size-3.5 shrink-0" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href={`${basePath}${toQueryString(clearFilters(query))}`}
        className="text-fg-muted hover:text-fg focus-visible:ring-brand-500 rounded-card px-2 py-1 text-sm underline focus-visible:ring-2 focus-visible:outline-none"
      >
        {t.clearFilters}
      </Link>
    </div>
  );
}
