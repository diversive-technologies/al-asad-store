import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatList, formatNumber, formatPlural, formatTemplate } from '@/lib/utils/format';

import type { CatalogueQuery, ResultPage } from '../schemas/search.schema';
import { listActiveFilters } from './active-filters';
import { activeFilterLabel } from './filter-labels';
import { hasActiveFilters, setPage } from './query-changes';

/**
 * MOD-04 — pure. What the listing shell decides from a query and the page the
 * backend served for it, kept out of the components so it can be tested
 * without rendering anything.
 */

/**
 * The query as SERVED: the address's filters, on the page the backend actually
 * answered with.
 *
 * They differ past the end. `/catalogue?page=99` is answered with the last page,
 * and drawing pagination from the ADDRESS then showed that last page's products
 * under a "previous" arrow to page 98 and no page numbers at all, because none of
 * the numbers around 99 exist. Everything the listing draws — pagination, the
 * sort and filter links, the announcement — reads this instead.
 */
export function servedQuery(query: CatalogueQuery, results: ResultPage): CatalogueQuery {
  return query.page === results.page ? query : setPage(query, results.page);
}

/**
 * The empty state, as two independent facts.
 *
 * `wording` says what came back empty. A typed search that found nothing is "no
 * results" — telling someone who searched for "zzzz" that nothing matches THOSE
 * FILTERS points them at controls they never touched.
 *
 * `recovery` says the way out. With filters applied, clearing them keeps the
 * words the customer typed (`clearFilters`) — sending them to the plain listing
 * threw their search away. With none, the way out is the whole catalogue.
 */
export interface ListingEmptyState {
  readonly wording: 'SEARCH' | 'FILTERS';
  readonly recovery: 'CLEAR_FILTERS' | 'BROWSE_ALL';
}

export function emptyStateFor(query: CatalogueQuery): ListingEmptyState {
  return {
    wording: query.term.length > 0 ? 'SEARCH' : 'FILTERS',
    recovery: hasActiveFilters(query) ? 'CLEAR_FILTERS' : 'BROWSE_ALL',
  };
}

/**
 * §30.3 — "in-place updates, filter results… are announced to assistive
 * technology". The sentence a polite live region reads after a filter, a sort or
 * a page changes the listing.
 *
 * A filter or a sort is a client navigation that changes only the query, so the
 * document title does not change and Next's route announcer has nothing new to
 * say. The sentence carries every part a control can change — what is applied,
 * the order and the page — so each of those changes the words, and a changed
 * live region is what gets read.
 */
export function listingAnnouncement(
  query: CatalogueQuery,
  results: ResultPage,
  locale: Locale,
  messages: Messages,
): string {
  const t = messages.catalogue;
  const filters = listActiveFilters(query, results.facets, results.collection).map((chip) =>
    activeFilterLabel(chip, locale, messages),
  );

  const values = {
    products: formatPlural(t.productCount, results.totalCount, locale),
    filters: formatList(filters, locale),
    sort: t.sort[query.sort],
    page: formatNumber(query.page, locale),
    pages: formatNumber(Math.max(results.totalPages, 1), locale),
  };

  return formatTemplate(filters.length > 0 ? t.listingStatusFiltered : t.listingStatus, values);
}
