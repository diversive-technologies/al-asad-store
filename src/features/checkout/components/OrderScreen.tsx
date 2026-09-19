'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { useOrderRead } from '../hooks/use-order-read';
import { OrderConfirmation } from './OrderConfirmation';
import { OrderLookup } from './OrderLookup';
import { OrderSkeleton } from './OrderSkeleton';

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
  // MOD-05 — the read, keyed by who is reading, and a lookup's arrival (`useOrderRead`).
  const { order, onFound, headingRef } = useOrderRead(orderNumber);

  if (order.isPending) {
    /*
     * A11Y-06 — the wait is announced rather than left as a blank page. The
     * segment's `loading.tsx` covers the server render, which is now instant;
     * this covers the read that follows it, in the same shape (NEXT-14).
     */
    return <OrderSkeleton label={messages.common.loading} />;
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
   * §28.3 — no order THIS BROWSER may see under that number: none exists, or
   * nothing here shows who placed it. Both get the same lookup by mobile, so the
   * page never says which numbers are real. A match fills the cache from the
   * backend's own answer (DATA-06), and the confirmation renders in place.
   */
  if (order.data === null) {
    return <OrderLookup orderNumber={orderNumber} messages={messages} onFound={onFound} />;
  }

  return (
    <OrderConfirmation
      order={order.data}
      locale={locale}
      messages={messages}
      headingRef={headingRef}
    />
  );
}
