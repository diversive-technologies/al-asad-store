import { redirect } from 'next/navigation';

import { ErrorState } from '@/components/shared/ErrorState';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { logApiError } from '@/lib/utils/log';

import { findByCode } from '../api/find-by-code';
import { listingAvailabilities } from '../api/listing-availability';
import { searchProducts } from '../api/search-products';
import type { CatalogueQuery } from '../schemas/search.schema';
import { CatalogueScreen } from './CatalogueScreen';
import { SearchField } from './SearchField';

export interface SearchScreenProps {
  query: CatalogueQuery;
  locale: Locale;
  messages: Messages;
}

/**
 * The search results page, as the feature composes it (STRUCT-02: the route
 * parses the address and hands over; the reads and the decisions live here).
 *
 * It reads the SAME query and renders the SAME listing as the catalogue, because
 * section 15 exposes one query for both. The differences are the heading, the
 * base path the controls link back to, the search field, and the code lookup.
 */
export async function SearchScreen({ query, locale, messages }: SearchScreenProps) {
  /*
   * PERF-02: the search and the code lookup are independent, so they run
   * together rather than one after the other. `byCode` declines the round trip
   * itself when the term cannot be a code.
   */
  const [results, codeMatch] = await Promise.all([
    searchProducts(query, locale),
    findByCode(query.term, locale),
  ]);

  /*
   * Section 28.1's code lookup is a shortcut, not the page. A failed lookup
   * costs the shortcut and nothing else, so it is logged and the results render
   * regardless (section 30.2).
   */
  if (!codeMatch.ok) logApiError('search:byCode', codeMatch.error);

  /*
   * An exact code match goes STRAIGHT to the product. Someone typing `AA-1004`
   * from a WhatsApp message has already chosen; showing them a card to click is
   * asking them to choose twice. Before the availability read on purpose — that
   * work is only needed for a page we are about to leave. Whether a term IS a
   * code stays the backend's judgement (DATA-13).
   */
  if (codeMatch.ok && codeMatch.value !== null) {
    redirect(ROUTES.catalogue.detail(codeMatch.value.slug));
  }

  if (!results.ok) {
    logApiError('search', results.error); // ERR-10
    return <ErrorState className="m-gutter" message={messages.errors.network} />;
  }

  const availabilities = await listingAvailabilities(results.value.products, 'search:availability');

  return (
    <>
      <div className="page-shell pt-10">
        {/* Keyed on the term (STATE-03): Next keeps a page's client state across a
            navigation that changes only the query, so a search run from the header
            or reached with Back left the previous words in this box. */}
        <SearchField key={query.term} initialTerm={query.term} messages={messages} />
      </div>

      <CatalogueScreen
        query={query}
        results={results.value}
        availabilities={availabilities}
        basePath={ROUTES.search}
        heading={query.term.length > 0 ? query.term : messages.search.title}
        locale={locale}
        messages={messages}
      />
    </>
  );
}
