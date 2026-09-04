import Link from 'next/link';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { assertNever } from '@/lib/result';
import { formatMoneyMinor, formatTemplate } from '@/lib/utils/format';
import { X } from '@/lib/vendor/icons';

import {
  clearFilters,
  listActiveFilters,
  removeActiveFilter,
  toQueryString,
  type ActiveFilter,
} from '../lib/search-params';
import type { CatalogueQuery, SearchFacets } from '../schemas/search.schema';

export interface FilterChipsProps {
  query: CatalogueQuery;
  facets: SearchFacets | null;
  basePath: string;
  locale: Locale;
  messages: Messages;
}

/**
 * The user-visible wording for a chip.
 *
 * It lives here rather than in `search-params.ts` on purpose: that module is
 * pure and React-free, and putting English in it would embed copy in a layer
 * that has no locale (I18N-01). It hands over the facts; this resolves them
 * against SSOT-07.
 */
function chipLabel(chip: ActiveFilter, locale: Locale, messages: Messages): string {
  const t = messages.catalogue;

  switch (chip.kind) {
    case 'facet':
      // Already localised by the backend — fabric and colour are protected
      // vocabularies and must be rendered exactly as supplied (I18N-09).
      return chip.label;

    case 'price': {
      const min = chip.minMinor === null ? null : formatMoneyMinor(chip.minMinor, locale);
      const max = chip.maxMinor === null ? null : formatMoneyMinor(chip.maxMinor, locale);

      // I18N-06: three whole parameterised messages, never a sentence built by
      // gluing "From" to a number to "to" to another number.
      if (min !== null && max !== null) return formatTemplate(t.priceRange, { min, max });
      if (min !== null) return formatTemplate(t.priceFrom, { min });
      if (max !== null) return formatTemplate(t.priceUpTo, { max });

      // Unreachable: a price chip is only emitted when a bound is set.
      return t.filterPrice;
    }

    case 'inStock':
      return t.inStockOnly;

    default:
      // TS-07: a new chip kind without wording is a compile error, not a blank.
      return assertNever(chip);
  }
}

/**
 * Section 28.1's removable chips and Clear all.
 *
 * Both are links, matching the panel: removing a filter is navigation to a
 * narrower URL, not a mutation. "Clear all" keeps the search term — dropping
 * filters is not abandoning the search — which `clearFilters` already decides.
 */
export function FilterChips({ query, facets, basePath, locale, messages }: FilterChipsProps) {
  const chips = listActiveFilters(query, facets);
  if (chips.length === 0) return null;

  const t = messages.catalogue;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* A11Y-01: a real list with a name, not a bare row of divs. */}
      <ul aria-label={t.activeFiltersLabel} className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => {
          const label = chipLabel(chip, locale, messages);

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
