import type { Metadata } from 'next';

import { BagPageScreen } from '@/features/bag/contract';
import { getLocale, getMessages } from '@/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  // A bag is per-customer and transient; there is nothing here to index (§30.5).
  return { title: messages.bag.title, robots: { index: false, follow: false } };
}

/**
 * The bag, at its own address.
 *
 * STRUCT-02: the route composes. It used to render a hard-coded empty state
 * because the cart did not exist yet — which became a page that CONTRADICTED
 * the panel once M4 landed, telling a customer with three items that their bag
 * was empty.
 */
export default async function BagPage() {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return <BagPageScreen locale={locale} messages={messages} />;
}
