import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { fetchOrder } from '@/features/checkout';
import { OrderConfirmation } from '@/features/checkout/contract';
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
 */
export default async function OrderPage({ params }: OrderPageProps) {
  const { orderNumber } = await params;

  // PERF-02: independent reads run in parallel, never as a waterfall.
  const [order, locale, messages] = await Promise.all([
    fetchOrder(orderNumber),
    getLocale(),
    getMessages(),
  ]);

  // A number that names no order is a 404, which is what it genuinely is.
  if (!order.ok) notFound();

  return <OrderConfirmation order={order.value} locale={locale} messages={messages} />;
}
