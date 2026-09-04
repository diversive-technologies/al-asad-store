import type { Metadata } from 'next';

import { ErrorState } from '@/components/shared/ErrorState';
import { ROUTES } from '@/config/routes';
import {
  CatalogueScreen,
  CodeMatch,
  fetchAvailability,
  findByCode,
  mergeAvailability,
  parseCatalogueQuery,
  searchProducts,
  SearchField,
} from '@/features/catalogue';
import { getLocale, getMessages } from '@/i18n';
import { logApiError } from '@/lib/utils/log';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return { title: messages.search.title };
}

export interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * The search results page.
 *
 * It reads the SAME query and renders the SAME screen as the catalogue listing,
 * because section 15 exposes one query for both. The only differences are the
 * heading, the base path pagination links back to, and the search field.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams;
  const query = parseCatalogueQuery(raw);

  const locale = await getLocale();

  /*
   * PERF-02: the search and the code lookup are independent, so they run
   * together rather than one after the other. Section 15 exposes them as two
   * reads and they stay two reads — `byCode` declines the round trip itself when
   * the term cannot be a code.
   */
  const [messages, results, codeMatch] = await Promise.all([
    getMessages(),
    searchProducts(query, locale),
    findByCode(query.term, locale),
  ]);

  if (!results.ok) {
    logApiError('search', results.error);
    return <ErrorState className="m-gutter" message={messages.errors.network} />;
  }

  /*
   * Section 28.1's code lookup is a shortcut, not the page. A failed lookup
   * costs the shortcut and nothing else, so it is logged and the results render
   * regardless (section 30.2).
   */
  if (!codeMatch.ok) logApiError('search:byCode', codeMatch.error);
  const matchedProduct = codeMatch.ok ? codeMatch.value : null;

  /*
   * One availability request covering the grid AND the code match, rather than
   * one each (PERF-02). The id is de-duplicated because the backend matches
   * codes in general search too, so the same product is usually in both.
   */
  const productIds = [
    ...new Set([
      ...results.value.products.map((product) => product.id),
      ...(matchedProduct === null ? [] : [matchedProduct.id]),
    ]),
  ];

  const availability = await fetchAvailability(productIds);
  if (!availability.ok) logApiError('search:availability', availability.error);

  const availabilities = availability.ok ? availability.value : [];
  const matchedEntry =
    matchedProduct === null ? null : (mergeAvailability([matchedProduct], availabilities)[0] ?? null);

  return (
    <>
      <div className="page-shell pt-10">
        <SearchField initialTerm={query.term} messages={messages} />
      </div>

      {matchedEntry === null ? null : (
        <CodeMatch entry={matchedEntry} locale={locale} messages={messages} />
      )}

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
