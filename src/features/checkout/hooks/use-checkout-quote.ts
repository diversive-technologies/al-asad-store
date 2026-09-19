'use client';

import { useState } from 'react';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { checkoutQuoteQuery } from '../api/checkout-quote-query';
import type { CheckoutQuote } from '../schemas/checkout.schema';

/** The two choices that re-price the order, as the fields that make them read them. */
export interface CheckoutChoices {
  /**
   * The delivery option shown chosen: the customer's pick, or — until they make
   * one — the option the backend priced the first quote with. `null` only while
   * there is no quote to say.
   */
  readonly deliveryOptionId: string | null;
  readonly onDeliveryChange: (deliveryOptionId: string) => void;
  readonly onGiftChange: (isGift: boolean) => void;
}

export interface CheckoutQuoteState {
  /**
   * `null` data is "nothing to check out"; an error is "the store could not be
   * reached". `isPlaceholderData` is a re-quote in flight, with the previous
   * quote still on screen.
   */
  quote: UseQueryResult<CheckoutQuote | null>;
  choices: CheckoutChoices;
}

/**
 * §17 `quote`, kept current with the two choices that change the total.
 *
 * Both are held here rather than read from the form, so the query key is a plain
 * value and the quote does not refetch on every keystroke elsewhere in the form —
 * and both matter, because the total is what decides whether Cash on Delivery is
 * offered at all (§17).
 *
 * The delivery option starts as NO choice. The first quote names none, and the
 * backend prices its default and says which that is (§3.1, DATA-13); this used to
 * start at `'standard'`, an id the interface wrote itself.
 */
export function useCheckoutQuote(): CheckoutQuoteState {
  const [chosen, setChosen] = useState<string | null>(null);
  const [isGift, setIsGift] = useState(false);

  const quote = useQuery(checkoutQuoteQuery(chosen, isGift));

  return {
    quote,
    choices: {
      deliveryOptionId: chosen ?? quote.data?.deliveryOptionId ?? null,
      onDeliveryChange: setChosen,
      onGiftChange: setIsGift,
    },
  };
}
