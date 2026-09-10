import type { Metadata } from 'next';

import { MeasurementStudio } from '@/features/made-to-measure';
import { getLocale, getMessages } from '@/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return {
    title: messages.madeToMeasure.pageTitle,
    description: messages.madeToMeasure.pageLead,
  };
}

/**
 * §34 — the measurement atelier at its own address.
 *
 * Public and usable WITHOUT buying anything, deliberately. It is the one thing
 * on the store somebody will open out of curiosity, and a customer who has
 * already measured themselves has made the buying decision easy.
 *
 * Full bleed rather than inside `page-shell`: the stage is the page, and a
 * gutter around a lit set turns it back into a picture of one.
 *
 * STRUCT-02: the route composes; it does not decide anything.
 */
export default async function StitchedPage() {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  // The root layout already renders `<main>`; a second one nested inside it is
  // invalid, and A11Y-01 cares about the landmark being singular.
  return <MeasurementStudio locale={locale} messages={messages} />;
}
