import type { Metadata } from 'next';

import { ErrorState } from '@/components/shared/ErrorState';
import { ROUTES } from '@/config/routes';
import {
  CatalogueScreen,
  fetchAvailability,
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
  const [messages, results] = await Promise.all([getMessages(), searchProducts(query, locale)]);

  if (!results.ok) {
    logApiError('search', results.error);
    return <ErrorState className="m-gutter" message={messages.errors.network} />;
  }

  const availability = await fetchAvailability(results.value.products.map((p) => p.id));
  if (!availability.ok) logApiError('search:availability', availability.error);

  return (
    <>
      <div className="page-shell pt-10">
        <SearchField initialTerm={query.term} messages={messages} />
      </div>

      <CatalogueScreen
        query={query}
        results={results.value}
        availabilities={availability.ok ? availability.value : []}
        basePath={ROUTES.search}
        heading={query.term.length > 0 ? query.term : messages.search.title}
        locale={locale}
        messages={messages}
      />
    </>
  );
}
