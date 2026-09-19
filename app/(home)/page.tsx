import type { Metadata } from 'next';

import { ErrorState } from '@/components/shared/ErrorState';
import { JsonLd } from '@/components/shared/JsonLd';
import { ROUTES } from '@/config/routes';
import { fetchAvailability } from '@/features/catalogue';
import { collectRailProductIds, fetchHomepage, HomepageSections } from '@/features/content';
import { getLocale, getMessages } from '@/i18n';
import { localeAlternates } from '@/lib/utils/locale-alternates';
import { logApiError } from '@/lib/utils/log';
import { storeStructuredData } from '@/lib/utils/structured-data';

/** NEXT-11 / section 30.5 — a unique title, description and canonical address per page. */
export async function generateMetadata(): Promise<Metadata> {
  const [messages, locale] = await Promise.all([getMessages(), getLocale()]);

  return {
    title: messages.home.metaTitle,
    description: messages.home.metaDescription,
    alternates: localeAlternates(ROUTES.home, locale),
  };
}

/**
 * STRUCT-02 — the route layer composes; it does not implement.
 *
 * Two reads with different caching intents, exactly as architecture 8.2
 * prescribes: the homepage projection is cached, and the availability overlay
 * that decorates it is live. The overlay is a single request covering every
 * rail on the page rather than one request per rail (PERF-02).
 */
export default async function HomePage() {
  // The homepage read is locale-scoped, so the locale is resolved first and the
  // two reads that depend on it then run together (PERF-02).
  const locale = await getLocale();
  const [messages, homepageResult] = await Promise.all([getMessages(), fetchHomepage(locale)]);

  // ERR-02: the failure path is handled as a value, not caught.
  if (!homepageResult.ok) {
    // ERR-10: logged once, here, at the boundary that handles it.
    logApiError('home', homepageResult.error);
    // ERR-11: user-facing copy comes from SSOT-07, never from error.message.
    return <ErrorState className="m-gutter" message={messages.errors.network} />;
  }

  const { sections } = homepageResult.value;
  const availabilityResult = await fetchAvailability(collectRailProductIds(sections));

  /*
   * Section 30.2: the purchase path must survive a degraded dependency. A
   * failed overlay costs the stock badges, not the page — every card then
   * reports availability as unknown rather than guessing (DATA-13a).
   */
  if (!availabilityResult.ok) logApiError('home:availability', availabilityResult.error);

  return (
    <>
      {/* §30.5 — the store and its website, by name and address only. */}
      <JsonLd data={storeStructuredData(messages.site.name)} />
      <HomepageSections
        sections={sections}
        availabilities={availabilityResult.ok ? availabilityResult.value : []}
        locale={locale}
        messages={messages}
      />
    </>
  );
}
