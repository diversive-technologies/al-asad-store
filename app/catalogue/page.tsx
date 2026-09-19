import type { Metadata } from 'next';

import { ErrorState } from '@/components/shared/ErrorState';
import { ROUTES } from '@/config/routes';
import {
  CatalogueScreen,
  listingAvailabilities,
  parseCatalogueQuery,
  searchProducts,
} from '@/features/catalogue';
import { getLocale, getMessages } from '@/i18n';
import { localeAlternates } from '@/lib/utils/locale-alternates';
import { logApiError } from '@/lib/utils/log';

export async function generateMetadata(): Promise<Metadata> {
  const [messages, locale] = await Promise.all([getMessages(), getLocale()]);
  // §30.5 — every filtered, sorted or paged view names the listing as canonical.
  return {
    title: messages.catalogue.title,
    alternates: localeAlternates(ROUTES.catalogue.list, locale),
  };
}

export interface CataloguePageProps {
  // NEXT-03: searchParams is a Promise in Next.js 16.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * STRUCT-02 — the route layer composes; it does not implement.
 *
 * Two reads with different caching intents, the same shape the homepage uses:
 * the catalogue projection is cached, and the availability overlay that
 * decorates it is live (architecture 8.2).
 */
export default async function CataloguePage({ searchParams }: CataloguePageProps) {
  const raw = await searchParams;
  // SEC-02: untrusted input, parsed totally — a mangled URL renders a page.
  const query = parseCatalogueQuery(raw);

  const locale = await getLocale();
  const [messages, results] = await Promise.all([getMessages(), searchProducts(query, locale)]);

  if (!results.ok) {
    logApiError('catalogue', results.error); // ERR-10
    return <ErrorState className="m-gutter" message={messages.errors.network} />;
  }

  // §30.2: a degraded overlay costs the stock badges, not the page.
  const availabilities = await listingAvailabilities(
    results.value.products,
    'catalogue:availability',
  );

  return (
    <CatalogueScreen
      query={query}
      results={results.value}
      availabilities={availabilities}
      basePath={ROUTES.catalogue.list}
      heading={messages.catalogue.title}
      locale={locale}
      messages={messages}
    />
  );
}
