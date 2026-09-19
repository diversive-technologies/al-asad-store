import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { getMobileColumns } from '../lib/grid-columns.server';
import { listingAnnouncement, servedQuery } from '../lib/listing';
import { mergeAvailability } from '../lib/product-card';
import type { ProductAvailability } from '../schemas/availability.schema';
import type { CatalogueQuery, ResultPage } from '../schemas/search.schema';
import { FilterChips } from './FilterChips';
import { GridColumnsScope } from './GridColumnsScope';
import { ListingEmpty } from './ListingEmpty';
import { ListingHead } from './ListingHead';
import { Pagination } from './Pagination';
import { ProductGrid } from './ProductGrid';

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
 *
 * Everything below draws from the query as SERVED (`servedQuery`): an address
 * past the last page is answered with the last page, and a pagination drawn from
 * the address offered numbers that do not exist.
 *
 * The root layout owns the page's one `<main>` (A11Y-01), so the results sit in
 * a plain block rather than a second, nested main landmark.
 *
 * The grid's column preference is read here rather than in each route, because
 * both routes render this shell and the preference belongs to the grid, not to
 * the address. Reading it on the server is what keeps the first paint correct —
 * see `grid-columns.server.ts`.
 *
 * §30.3 — a filter, a sort or a page is a client navigation that keeps the
 * status line below and changes its words, and a changed live region is read.
 * The first paint is not an update and is not announced.
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
  const served = servedQuery(query, results);
  const entries = mergeAvailability(results.products, availabilities);
  const mobileColumns = await getMobileColumns();

  return (
    <div className="page-shell py-10">
      <Breadcrumbs
        label={messages.common.breadcrumbLabel}
        steps={[
          { label: messages.catalogue.breadcrumbHome, href: ROUTES.home },
          { label: heading },
        ]}
        canonicalPath={basePath}
      />

      <GridColumnsScope initialColumns={mobileColumns}>
        <div className="flex flex-col gap-4">
          <ListingHead
            query={served}
            results={results}
            basePath={basePath}
            heading={heading}
            locale={locale}
            messages={messages}
          />

          <FilterChips
            query={served}
            facets={results.facets}
            collection={results.collection}
            basePath={basePath}
            locale={locale}
            messages={messages}
          />

          <p role="status" className="sr-only">
            {listingAnnouncement(served, results, locale, messages)}
          </p>

          {entries.length === 0 ? (
            <ListingEmpty query={served} basePath={basePath} messages={messages} />
          ) : (
            <>
              {/* A11Y-09: every card names itself in an h3, so the grid has an h2
                  under the page's h1 rather than a skipped level. */}
              <h2 className="sr-only">{messages.catalogue.productsHeading}</h2>
              <ProductGrid entries={entries} locale={locale} messages={messages} />
              <Pagination
                query={served}
                totalPages={results.totalPages}
                basePath={basePath}
                locale={locale}
                messages={messages}
              />
            </>
          )}
        </div>
      </GridColumnsScope>
    </div>
  );
}
