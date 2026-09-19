import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { OrderScreen } from '@/features/checkout/contract';
import { getLocale, getMessages } from '@/i18n';
import { orderNumberSchema } from '@/lib/domain/ids';

interface OrderPageProps {
  /** NEXT-03: dynamic params are a Promise in Next.js 16. */
  params: Promise<{ orderNumber: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  // An order page is somebody's private receipt. It is never indexed.
  return { title: messages.order.pageTitle, robots: { index: false, follow: false } };
}

/**
 * §28.3 — the order number is the address, so this page can be bookmarked and
 * returned to. It is NOT the key: who may read the order is decided on the far
 * side of the BFF, and anyone else is asked for the order's mobile number.
 *
 * STRUCT-02: the route composes and does not decide. The read itself moved into
 * `OrderScreen`, which runs in the browser — under D1 the order lives in mock
 * state written by a Route Handler, and on a serverless deployment a server
 * render is a different process that has never seen it.
 */
export default async function OrderPage({ params }: OrderPageProps) {
  // PERF-02: independent reads run in parallel, never as a waterfall.
  const [{ orderNumber }, locale, messages] = await Promise.all([
    params,
    getLocale(),
    getMessages(),
  ]);

  // SEC-02 — a route param is untrusted; one that cannot be an order number is a 404.
  const parsed = orderNumberSchema.safeParse(orderNumber);
  if (!parsed.success) notFound();

  return <OrderScreen orderNumber={parsed.data} locale={locale} messages={messages} />;
}
