import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ErrorState } from '@/components/shared/ErrorState';
import { ROUTES, STORE_PAGE_SLUGS } from '@/config/routes';
import { fetchPage, StaticPageArticle, StoreContactDetails } from '@/features/content';
import { getLocale, getMessages } from '@/i18n';
import { localeAlternates } from '@/lib/utils/locale-alternates';
import { logApiError } from '@/lib/utils/log';

export interface HelpPageProps {
  // NEXT-03: params is a Promise in Next.js 16.
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: HelpPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const page = await fetchPage(slug, locale);

  // NEXT-11 / section 30.5: a unique title and canonical address, from the content itself.
  if (!page.ok || page.value === null) return {};
  return {
    title: page.value.title,
    description: page.value.intro,
    alternates: localeAlternates(ROUTES.help.page(page.value.slug), locale),
  };
}

/**
 * Section 28.4's help pages AND its static pages (about, contact, delivery,
 * returns, terms, privacy), all served by section 21's Content module.
 *
 * One route for all of them: they differ only in content, so a route each would
 * be copies of the same composition (PD-01) — and §21 serves them from ONE slug
 * namespace, so a second route over it would put every page at two addresses.
 * STRUCT-02: the rendering of a page's blocks is the Content feature's.
 *
 * Contact us is the one page given something the content does not carry: the
 * store's contact details, which are configuration (D5), not copy.
 */
export default async function HelpPage({ params }: HelpPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const [messages, result] = await Promise.all([getMessages(), fetchPage(slug, locale)]);

  if (!result.ok) {
    logApiError('help', result.error); // ERR-10
    return <ErrorState className="m-gutter" message={messages.errors.network} />;
  }

  // ERR-06: notFound() is a framework control-flow signal, not error handling.
  if (result.value === null) notFound();

  return (
    <StaticPageArticle page={result.value}>
      {result.value.slug === STORE_PAGE_SLUGS.contact ? (
        <StoreContactDetails locale={locale} messages={messages} />
      ) : null}
    </StaticPageArticle>
  );
}
