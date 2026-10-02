import type { Metadata } from 'next';

import { OrderLookup } from '@/features/checkout/components/OrderLookup';
import { getMessages } from '@/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  // Guest lookup page is a form, never indexed by search engines.
  return {
    title: messages.order.findOrder,
    robots: { index: false, follow: false },
  };
}

/**
 * F-04 · Find-my-order page (`ROUTES.findOrder` / `/order`).
 *
 * Allows a guest or customer without an active session to locate their order
 * by supplying both order number and mobile number.
 */
export default async function FindOrderPage() {
  const messages = await getMessages();

  return <OrderLookup messages={messages} />;
}
