import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ErrorState } from '@/components/shared/ErrorState';
import { ROUTES } from '@/config/routes';
import {
  CatalogueScreen,
  fetchAvailability,
  findByCode,
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

  /*
   * Section 28.1's code lookup is a shortcut, not the page. A failed lookup
   * costs the shortcut and nothing else, so it is logged and the results render
   * regardless (section 30.2).
   */
  if (!codeMatch.ok) logApiError('search:byCode', codeMatch.error);

  /*
   * An exact code match goes STRAIGHT to the product.
   *
   * Someone typing `AA-1004` from a WhatsApp message or a printed catalogue has
   * already chosen; showing them a card to click is asking them to choose
   * twice. This used to render `CodeMatch` above the results because
   * `/catalogue/[slug]` did not exist yet — M3 built it, so the shortcut is a
   * real shortcut now.
   *
   * Before the availability read on purpose: that work is only needed for a
   * page we are about to leave. Whether a term IS a code stays the backend's
   * judgement (DATA-13) — `findByCode` returns a product or nothing.
   */
  if (codeMatch.ok && codeMatch.value !== null) {
    redirect(ROUTES.catalogue.detail(codeMatch.value.slug));
  }

  if (!results.ok) {
    logApiError('search', results.error);
    return <ErrorState className="m-gutter" message={messages.errors.network} />;
  }

  const availability = await fetchAvailability(results.value.products.map((product) => product.id));
  if (!availability.ok) logApiError('search:availability', availability.error);

  const availabilities = availability.ok ? availability.value : [];

  return (
    <>
      <div className="page-shell pt-10">
        <SearchField initialTerm={query.term} messages={messages} />
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
