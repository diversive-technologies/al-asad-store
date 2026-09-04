import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { setInStockOnly, toQueryString } from '../lib/search-params';
import {
  FACET_KEYS,
  type CatalogueQuery,
  type FacetKey,
  type SearchFacets,
} from '../schemas/search.schema';
import { FacetGroup } from './FacetGroup';
import { FilterDisclosure } from './FilterDisclosure';
import { FilterToggleLink } from './FilterToggleLink';
import { PriceFilter } from './PriceFilter';

export interface FilterPanelProps {
  query: CatalogueQuery;
  /** `null` when the search index is degraded — section 15. */
  facets: SearchFacets | null;
  basePath: string;
  locale: Locale;
  messages: Messages;
}

/**
 * Piece count is held as numbers and every other facet as strings, so the
 * comparison the rows do is normalised in one place rather than in each row.
 */
function selectedValues(query: CatalogueQuery, facet: FacetKey): readonly string[] {
  return facet === 'pieceCount' ? query.pieceCount.map(String) : query[facet];
}

/**
 * Section 28.1's six filters: Fabric, Colour, Garment type, Piece count, Price
 * and In stock only.
 *
 * A Server Component with exactly one client leaf (`PriceFilter`). Everything
 * else is a link, so the panel ships no JavaScript, every filter combination is
 * a real crawlable URL, and the back button walks the customer back through
 * their own filtering (STATE-01 rung 4).
 *
 * When the index is degraded, section 15 says facet counts are absent — not
 * zero. The groups vanish because there are no values to offer, and a notice
 * says so. Inventing a count would be a lie about the catalogue (DATA-13).
 *
 * Known limitation, stated rather than hidden (PD-05): on a small screen this
 * column stacks above the grid, so the products sit below the filters. The
 * correct fix is a slide-over drawer, which A11Y-08 requires to trap focus,
 * restore it on close and respond to Escape — a real dialog, not a hidden
 * `<div>`. That belongs with the bag panel in M4, where the same primitive is
 * needed and can be built once.
 */
export function FilterPanel({ query, facets, basePath, locale, messages }: FilterPanelProps) {
  const t = messages.catalogue;

  return (
    <aside aria-label={t.filtersHeading} className="flex flex-col">
      <h2 className="text-fg mb-1 text-sm font-semibold tracking-wide uppercase">
        {t.filtersHeading}
      </h2>

      {facets === null ? (
        <p className="text-fg-muted border-border border-b py-3 text-sm">{t.facetsUnavailable}</p>
      ) : (
        FACET_KEYS.map((facet) => (
          <FacetGroup
            key={facet}
            facet={facet}
            entries={facets[facet]}
            selected={selectedValues(query, facet)}
            query={query}
            basePath={basePath}
            locale={locale}
            messages={messages}
          />
        ))
      )}

      <FilterDisclosure title={t.filterPrice}>
        {/*
         * The key is the active range, so navigating to a different one — or
         * removing the price chip — remounts the form and its uncontrolled boxes
         * read their defaults again. That is what lets `PriceFilter` avoid
         * mirroring URL state into `useState` and syncing it (STATE-04).
         */}
        <PriceFilter
          key={`${String(query.priceMinMinor)}-${String(query.priceMaxMinor)}`}
          query={query}
          basePath={basePath}
          messages={messages}
        />
      </FilterDisclosure>

      <FilterDisclosure title={t.filterAvailability}>
        <ul className="flex flex-col gap-0.5">
          <li>
            <FilterToggleLink
              href={`${basePath}${toQueryString(setInStockOnly(query, !query.inStockOnly))}`}
              label={t.inStockOnly}
              count={facets?.inStockCount ?? null}
              isSelected={query.inStockOnly}
              locale={locale}
              messages={messages}
            />
          </li>
        </ul>
      </FilterDisclosure>
    </aside>
  );
}
