import type { Metadata } from 'next';

import { CheckoutScreen } from '@/features/checkout/contract';
import { getLocale, getMessages } from '@/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  /*
   * §30.5: a checkout page has nothing to offer a search engine and everything
   * to lose from being indexed — it is per-customer and transient.
   */
  return { title: messages.checkout.title, robots: { index: false, follow: false } };
}

/**
 * §28.2's single-page checkout.
 *
 * STRUCT-02: the route composes. The screen is a Client Component because the
 * quote re-reads as the customer changes delivery and gifting, and because a
 * form with per-field validation is client work (FORM-02).
 */
export default async function CheckoutPage() {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return <CheckoutScreen locale={locale} messages={messages} />;
}
