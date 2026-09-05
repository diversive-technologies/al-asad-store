import Link from 'next/link';

import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatPlural } from '@/lib/utils/format';

import { mergeAvailability } from '../lib/product-card';
import { hasActiveFilters, listActiveFilters } from '../lib/search-params';
import type { ProductAvailability } from '../schemas/availability.schema';
import type { CatalogueQuery, ResultPage } from '../schemas/search.schema';
import { FilterChips } from './FilterChips';
import { FilterDrawer } from './FilterDrawer';
import { FilterPanel } from './FilterPanel';
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
export function CatalogueScreen({
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

      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-fg text-2xl font-semibold">{heading}</h1>
        {/* I18N-07: the count goes through the locale's plural rules. */}
        <p className="text-fg-muted text-sm">
          <bdi>{formatPlural(t.productCount, results.totalCount, locale)}</bdi>
        </p>
      </header>

      <div className="listing-layout">
        <FilterPanel
          query={query}
          facets={results.facets}
          basePath={basePath}
          locale={locale}
          messages={messages}
        />

        {/* A11Y-01: the results are the page's main content, and say so. */}
        <main className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/*
             * Rendered a SECOND time, for the drawer. The duplicate is the
             * price of keeping `FilterPanel` a Server Component on both
             * surfaces: it ships no JavaScript either way, and moving one DOM
             * subtree between two parents at a breakpoint is not something CSS
             * can do. `PriceFilter` generates its ids, so the two copies do not
             * collide.
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

            <SortControl query={query} basePath={basePath} messages={messages} />
          </div>

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
      </div>
    </div>
  );
}
