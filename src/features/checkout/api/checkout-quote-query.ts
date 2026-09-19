import { keepPreviousData, type UseQueryOptions } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';

import type { CheckoutQuote } from '../schemas/checkout.schema';
import { fetchQuote } from './checkout-browser';

type QuoteKey = ReturnType<typeof queryKeys.checkout.quote>;

/**
 * §17 `quote` as one query definition — its key, its read and its caching in one
 * place, so the screen and the test that pins its behaviour ask the same question.
 *
 * `deliveryOptionId` null names no option: the backend prices its default and
 * says which that is (`CheckoutQuote.deliveryOptionId`).
 *
 * `placeholderData: keepPreviousData` — changing the delivery option or ticking
 * the gift box is a NEW key, and without it the query went back to pending: the
 * whole checkout form unmounted into a loading line and remounted, focus fell to
 * the page on every re-quote, and a keyboard user was thrown to the top of the
 * document. The quote on screen now stays until the new one lands, and the
 * screen says it is being re-read (`isPlaceholderData`) instead of hiding the form.
 */
export function checkoutQuoteQuery(
  deliveryOptionId: string | null,
  isGift: boolean,
): UseQueryOptions<CheckoutQuote | null, Error, CheckoutQuote | null, QuoteKey> {
  return {
    queryKey: queryKeys.checkout.quote(deliveryOptionId, isGift),
    // DATA-03a: absence arrives as `null`, so only a failed read is a rejection.
    queryFn: ({ signal }) => unwrap(fetchQuote(deliveryOptionId, isGift, signal)),
    placeholderData: keepPreviousData,
    // DATA-09: a quote reflects live stock, a live promotion and a cap the
    // operator can change. There is no interval over which it is safe to reuse.
    staleTime: 0,
    retry: false,
  };
}
