import type { Metadata } from 'next';

import { ROUTES } from '@/config/routes';
import { parseCatalogueQuery, SearchScreen } from '@/features/catalogue';
import { getLocale, getMessages } from '@/i18n';
import { localeAlternates } from '@/lib/utils/locale-alternates';

export async function generateMetadata(): Promise<Metadata> {
  const [messages, locale] = await Promise.all([getMessages(), getLocale()]);
  // §30.5 — a search for any term names the search page as canonical.
  return { title: messages.search.title, alternates: localeAlternates(ROUTES.search, locale) };
}

export interface SearchPageProps {
  // NEXT-03: searchParams is a Promise in Next.js 16.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * STRUCT-02 — the route layer composes; it does not implement. The search, the
 * code lookup and its redirect, and the availability overlay are the feature's
 * (`SearchScreen`).
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams;
  // SEC-02: untrusted input, parsed totally — a mangled URL renders a page.
  const query = parseCatalogueQuery(raw);

  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return <SearchScreen query={query} locale={locale} messages={messages} />;
}
