import type { Metadata } from 'next';

import { OrderScreen } from '@/features/checkout/contract';
import { getLocale, getMessages } from '@/i18n';

interface OrderPageProps {
  /** NEXT-03: dynamic params are a Promise in Next.js 16. */
  params: Promise<{ orderNumber: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  // An order page is somebody's private receipt. It is never indexed.
  return { title: messages.order.title, robots: { index: false, follow: false } };
}

/**
 * §28.3 — the order number is the address, so this page can be bookmarked,
 * shared with the shop over the phone, and returned to later.
 *
 * STRUCT-02: the route composes and does not decide. The read itself moved into
 * `OrderScreen`, which runs in the browser — under D1 the order lives in mock
 * state written by a Route Handler, and on a serverless deployment a server
 * render is a different process that has never seen it. Reading it here made
 * every placed order answer 404 in production and none of them locally.
 */
export default async function OrderPage({ params }: OrderPageProps) {
  // PERF-02: independent reads run in parallel, never as a waterfall.
  const [{ orderNumber }, locale, messages] = await Promise.all([
    params,
    getLocale(),
    getMessages(),
  ]);

  return <OrderScreen orderNumber={orderNumber} locale={locale} messages={messages} />;
}
