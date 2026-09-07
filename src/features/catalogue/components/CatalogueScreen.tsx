import Link from 'next/link';

import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatPlural } from '@/lib/utils/format';

import { getMobileColumns } from '../lib/grid-columns.server';
import { mergeAvailability } from '../lib/product-card';
import { hasActiveFilters, listActiveFilters } from '../lib/search-params';
import type { ProductAvailability } from '../schemas/availability.schema';
import type { CatalogueQuery, ResultPage } from '../schemas/search.schema';
import { FilterChips } from './FilterChips';
import { FilterDrawer } from './FilterDrawer';
import { FilterPanel } from './FilterPanel';
import { GridColumnsControl } from './GridColumnsControl';
import { GridColumnsScope } from './GridColumnsScope';
import { Pagination } from './Pagination';
import { ProductGrid } from './ProductGrid';
import { SortControl } from './SortControl';

export interface CatalogueScreenProps {
  query: CatalogueQuery;
  results: ResultPage;
  availabilities: readonly ProductAvailability[];
  basePath: string;
  heading: string;
  locale: Locale;
  messages: Messages;
}

/**
 * The shared listing shell, used by BOTH `/catalogue` and `/search`.
 *
 * Section 15 exposes one query — `search(term, filters, sort, paging)` — and the
 * listing is that query with an empty term. Two screens would mean two grids,
 * two paginations and two ways for them to disagree, so there is one.
 */
export async function CatalogueScreen({
  query,
  results,
  availabilities,
  basePath,
  heading,
  locale,
  messages,
}: CatalogueScreenProps) {
  const t = messages.catalogue;
  const entries = mergeAvailability(results.products, availabilities);
  /*
   * The same list the removable chips are built from, so the drawer's badge and
   * the chips can never disagree about how many filters are on (PD-01).
   */
  const activeFilterCount = listActiveFilters(query, results.facets).length;

  /*
   * Read here rather than in each route, because both `/catalogue` and
   * `/search` render this shell and the preference belongs to the grid, not to
   * the address. Reading it on the server is what keeps the first paint correct
   * — see `grid-columns.server.ts`.
   */
  const mobileColumns = await getMobileColumns();

  return (
    <div className="page-shell py-10">
      {/* Section 30.5 asks for breadcrumbs; A11Y-01 makes them a real nav. */}
      <nav aria-label={t.title} className="text-fg-muted mb-4 text-sm">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={ROUTES.home} className="hover:text-fg">
              {t.breadcrumbHome}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-fg">{heading}</li>
        </ol>
      </nav>

      <GridColumnsScope initialColumns={mobileColumns}>
        {/* A11Y-01: the results are the page's main content, and say so. */}
        <main className="flex flex-col gap-4">
          {/*
           * Title, count and controls in ONE grid, which lays itself out
           * differently at the two sizes rather than being written twice.
           *
           * On a phone it is two rows — title and count on the first, the
           * controls spread across the second — which is exactly what it was
           * before. From 64rem it collapses to a single row, because on a wide
           * screen the two rows were mostly empty: a heading alone on one line
           * and two small buttons alone on the next, with a page-width of gap
           * between them.
           *
           * A grid rather than flexbox because the count has to move BETWEEN
           * groups — beside the title on a phone, beside the controls on a
           * desktop — and `grid-template-areas` can re-place a child that
           * flex-wrapping cannot.
           */}
          <header className="listing-head">
            <h1 className="listing-title text-fg text-2xl font-semibold">{heading}</h1>

            {/* I18N-07: the count goes through the locale's plural rules. */}
            <p className="listing-count text-fg-muted text-sm">
              <bdi>{formatPlural(t.productCount, results.totalCount, locale)}</bdi>
            </p>

            <div className="listing-controls">
            {/*
             * The ONLY copy of the panel now. It used to be rendered twice —
             * once for a permanent desktop rail and once here — and dropping
             * the rail dropped the duplicate with it.
             */}
            <FilterDrawer messages={messages} activeCount={activeFilterCount}>
              <FilterPanel
                query={query}
                facets={results.facets}
                basePath={basePath}
                locale={locale}
                messages={messages}
                hideHeading
              />
            </FilterDrawer>

            {/* Filter · layout · sort, in that order, because the layout control
                is a view preference and sits between what is shown and how it
                is ordered. Hidden from `md` up — see the component. */}
            <GridColumnsControl messages={messages} />

            <SortControl query={query} basePath={basePath} messages={messages} />
            </div>
          </header>

          <FilterChips
            query={query}
            facets={results.facets}
            basePath={basePath}
            locale={locale}
            messages={messages}
          />

          {entries.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-16 text-start">
              <h2 className="text-fg text-lg font-medium">{t.noResultsHeading}</h2>
              <p className="text-fg-muted">{t.noResultsBody}</p>
              {/* Section 28.1's no-results recovery: always a way back to stock. */}
              <ButtonLink href={ROUTES.catalogue.list} variant="secondary">
                {hasActiveFilters(query) ? t.clearFilters : t.browseAll}
              </ButtonLink>
            </div>
          ) : (
            <>
              <ProductGrid entries={entries} locale={locale} messages={messages} />
              <Pagination
                query={query}
                totalPages={results.totalPages}
                basePath={basePath}
                locale={locale}
                messages={messages}
              />
            </>
          )}
        </main>
      </GridColumnsScope>
    </div>
  );
}
