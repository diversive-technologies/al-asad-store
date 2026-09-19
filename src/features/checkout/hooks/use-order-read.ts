'use client';

import { useCallback, useState } from 'react';

import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { accountKeyOf, useSession } from '@/features/auth';
import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';

import { fetchOrderByNumber } from '../api/checkout-browser';
import type { Order } from '../schemas/checkout.schema';

export interface OrderRead {
  /** `null` data is "no order this browser may see under that number". */
  order: UseQueryResult<Order | null>;
  /** A lookup matched: its order is what this reader's read answers now (DATA-06). */
  onFound: (order: Order) => void;
  /** For the order's heading: focuses it when the order arrived by a lookup. */
  headingRef: ((heading: HTMLHeadingElement | null) => void) | undefined;
}

/**
 * MOD-05 — §28.3's order, read from the browser, and what happens when a lookup
 * finds it.
 *
 * KEYED BY WHO IS READING as well as by the number, for the saved items' reason:
 * whether an order may be read depends on who asks, and signing out is a soft
 * navigation the query cache survives. Keyed by the number alone, the next person
 * at a shared browser was served the previous customer's name, address and
 * measurements out of the cache, with no request made.
 *
 * A lookup that matches swaps its form for the order, and the button that was
 * pressed leaves with the form. Focus goes to the order's heading (A11Y-02,
 * §30.3); it used to fall to the page, with nothing said.
 */
export function useOrderRead(orderNumber: string): OrderRead {
  const queryClient = useQueryClient();
  const session = useSession();
  const orderKey = queryKeys.checkout.order(
    orderNumber,
    session.isSignedIn ? accountKeyOf(session) : '',
  );
  const [foundByLookup, setFoundByLookup] = useState(false);

  const order = useQuery({
    queryKey: orderKey,
    // DATA-03a: `unwrap` is the ONLY sanctioned Result → rejection adapter, and
    // it belongs here and nowhere else. Absence is not in the error channel, so
    // it arrives as `null` rather than as a rejection.
    queryFn: ({ signal }) => unwrap(fetchOrderByNumber(orderNumber, signal)),
  });

  // A ref callback, not an effect: it runs as the heading enters the document.
  const focusHeading = useCallback((heading: HTMLHeadingElement | null) => {
    heading?.focus();
  }, []);

  return {
    order,
    onFound: (found) => {
      setFoundByLookup(true);
      queryClient.setQueryData(orderKey, found);
    },
    headingRef: foundByLookup ? focusHeading : undefined,
  };
}
