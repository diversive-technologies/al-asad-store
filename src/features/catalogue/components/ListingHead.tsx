import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatPlural } from '@/lib/utils/format';

import { listActiveFilters } from '../lib/active-filters';
import type { CatalogueQuery, ResultPage } from '../schemas/search.schema';
import { FilterDrawer } from './FilterDrawer';
import { FilterPanel } from './FilterPanel';
import { GridColumnsControl } from './GridColumnsControl';
import { SortControl } from './SortControl';

export interface ListingHeadProps {
  /** The query as served — see `servedQuery`. */
  query: CatalogueQuery;
  results: ResultPage;
  basePath: string;
  heading: string;
  locale: Locale;
  messages: Messages;
}

/**
 * The listing's head: title, count and controls in ONE grid, which lays itself
 * out differently at the two sizes rather than being written twice.
 *
 * On a phone it is two rows — title and count on the first, the controls spread
 * across the second. From 64rem it collapses to a single row, because on a wide
 * screen the two rows were mostly empty: a heading alone on one line and two
 * small buttons alone on the next, with a page-width of gap between them.
 *
 * A grid rather than flexbox because the count has to move BETWEEN groups —
 * beside the title on a phone, beside the controls on a desktop — and
 * `grid-template-areas` can re-place a child that flex-wrapping cannot.
 *
 * Filter · layout · sort, in that order, because the layout control is a view
 * preference and sits between what is shown and how it is ordered. The panel is
 * rendered once, inside the drawer: dropping the permanent rail dropped its
 * duplicate with it.
 */
export function ListingHead({
  query,
  results,
  basePath,
  heading,
  locale,
  messages,
}: ListingHeadProps) {
  /*
   * The same list the removable chips are built from, so the drawer's badge and
   * the chips can never disagree about how many filters are on (PD-01).
   */
  const activeFilterCount = listActiveFilters(query, results.facets, results.collection).length;

  return (
    <header className="listing-head">
      <h1 className="listing-title text-fg text-2xl font-semibold">{heading}</h1>

      {/* I18N-07: the count goes through the locale's plural rules. */}
      <p className="listing-count text-fg-muted text-sm">
        <bdi>{formatPlural(messages.catalogue.productCount, results.totalCount, locale)}</bdi>
      </p>

      <div className="listing-controls">
        <FilterDrawer messages={messages} locale={locale} activeCount={activeFilterCount}>
          <FilterPanel
            query={query}
            facets={results.facets}
            basePath={basePath}
            locale={locale}
            messages={messages}
            hideHeading
          />
        </FilterDrawer>

        {/* Hidden from `md` up — see the component. */}
        <GridColumnsControl locale={locale} messages={messages} />

        <SortControl query={query} basePath={basePath} messages={messages} />
      </div>
    </header>
  );
}
