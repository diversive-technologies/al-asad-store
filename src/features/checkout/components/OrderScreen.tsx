'use client';

import { notFound } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { ErrorState } from '@/components/shared/ErrorState';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';

import { fetchOrderByNumber } from '../api/checkout-browser';
import { OrderConfirmation } from './OrderConfirmation';

export interface OrderScreenProps {
  orderNumber: string;
  locale: Locale;
  messages: Messages;
}

/**
 * §28.3's order, read from the browser.
 *
 * DATA-05 — a Client Component fetches through TanStack Query. The read moved
 * off the server render deliberately: under D1 the order lives in mock state
 * that only the Route Handler process has written to, so a server render was
 * reading an empty table and answering 404 for every real order. `/bag` has
 * always worked this way; this is the order joining it. See the BFF at
 * `app/api/checkout/order/[orderNumber]` for the whole story.
 *
 * The three outcomes below are three different things and are kept apart, which
 * is the other half of the fix. Collapsing them is what made a dead mock layer
 * read as a missing order.
 */
export function OrderScreen({ orderNumber, locale, messages }: OrderScreenProps) {
  const order = useQuery({
    queryKey: queryKeys.checkout.order(orderNumber),
    // DATA-03a: `unwrap` is the ONLY sanctioned Result → rejection adapter, and
    // it belongs here and nowhere else. Absence is not in the error channel, so
    // it arrives below as `null` rather than as a rejection.
    queryFn: ({ signal }) => unwrap(fetchOrderByNumber(orderNumber, signal)),
  });

  if (order.isPending) {
    /*
     * A11Y-06 — the wait is announced rather than left as a blank page. The
     * segment's `loading.tsx` covers the server render, which is now instant;
     * this covers the read that follows it.
     */
    return (
      <p role="status" className="page-shell text-fg-muted py-16">
        {messages.common.loading}
      </p>
    );
  }

  /*
   * ERR-11 — the store could not be reached. Copy comes from SSOT-07 and the
   * caught failure is never rendered (SEC-07). Critically this is NOT a 404:
   * telling someone who has just paid that their order does not exist is a far
   * worse answer than telling them the store is unreachable, and it is the
   * answer this page used to give for every transport and contract failure.
   */
  if (order.isError) {
    return <ErrorState message={messages.errors.network} className="page-shell my-16" />;
  }

  /*
   * ERR-06 — a number that names no order is a 404, which is what it genuinely
   * is. That sentence was always right; it was simply being applied to failures
   * as well, which is the defect. Now only real absence reaches it.
   */
  if (order.data === null) notFound();

  return <OrderConfirmation order={order.data} locale={locale} messages={messages} />;
}
