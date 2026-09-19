'use client';

import { useRef, useState, type FormEvent } from 'react';

import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { ROUTES } from '@/config/routes';
import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';
import { onDemandResolver } from '@/lib/utils/on-demand-resolver';

import { placeOrder, type PlaceOrderError } from '../api/checkout-browser';
import {
  afterFailure,
  afterRefusal,
  type CheckoutOutcome,
  type PlacementFollowUp,
} from '../lib/placement-outcome';
import type { CheckoutFormInput, CheckoutQuote } from '../schemas/checkout.schema';
import type { PlaceOrderRequest, PlaceOrderResult } from '../schemas/place-order.schema';

/*
 * Deliberate code split (IMP-01a, PERF-10): FORM-01's one schema reaches the form
 * on demand (`onDemandResolver` has the reasoning). On this page it is usually
 * already there: the quote read brings the checkout schemas in beside itself.
 */
const validation = onDemandResolver<CheckoutFormInput>(() =>
  Promise.all([import('@hookform/resolvers/zod'), import('../schemas/checkout.schema')]).then(
    ([{ zodResolver }, { checkoutFormSchema }]) => zodResolver(checkoutFormSchema),
  ),
);

export interface PlaceOrderState {
  form: UseFormReturn<CheckoutFormInput>;
  /** Why the last attempt did not go through, or `null`. */
  outcome: CheckoutOutcome | null;
  isPlacing: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Starts the validation's download; the form calls it when first focused. */
  warmUp: () => void;
}

const EMPTY_CHECKOUT: CheckoutFormInput = {
  contactName: '',
  contactMobile: '',
  contactEmail: '',
  addressLine: '',
  addressCity: '',
  paymentMethodId: '',
  isGift: false,
  giftMessage: '',
};

/**
 * MOD-05 — §7.2 from the form: validate, place against the quote the customer
 * was SHOWN, and either leave for the order's own address or say why not
 * (`lib/placement-outcome.ts` decides what is said and read again).
 *
 * FORM-06, synchronously — see `useAddToBag` for why `isPending` is not
 * sufficient. Here the cost of the gap would be two orders, not two items. The
 * latch is read only inside the submit handler, which composes `handleSubmit`
 * there rather than during render.
 *
 * @param quote The quote on screen. Its total arms §7.2 step 2 and its delivery
 *   option is the one placed, so the two cannot disagree. A press while it is
 *   being re-read (`isPlaceholderData`) waits: the total on screen is not yet the
 *   total for what is chosen.
 */
export function usePlaceOrder(
  quote: UseQueryResult<CheckoutQuote | null>,
  failedReason: string,
): PlaceOrderState {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState<CheckoutOutcome | null>(null);
  const inFlight = useRef(false);

  // FORM-01 / FORM-02: one Zod schema, React Hook Form, `zodResolver`.
  const form = useForm<CheckoutFormInput>({
    resolver: validation.resolver,
    defaultValues: EMPTY_CHECKOUT,
  });

  function follow({ outcome: next, rereadQuote, rereadBag }: PlacementFollowUp): void {
    setOutcome(next);
    if (rereadQuote) void quote.refetch();
    // DATA-06 — the bag changed on the server, or may have.
    if (rereadBag) void queryClient.invalidateQueries({ queryKey: queryKeys.bag.all });
  }

  const place = useMutation<PlaceOrderResult, PlaceOrderError, PlaceOrderRequest>({
    mutationFn: (request) => unwrap(placeOrder(request)),
    onSuccess: (result) => {
      if (result.kind !== 'PLACED') return follow(afterRefusal(result));
      /* DATA-06 — the cart was converted on commit, so its cache entry goes too,
         or the header keeps counting a bag that no longer exists. The order
         number is the address (§28.3), so this is a navigation. */
      queryClient.removeQueries({ queryKey: queryKeys.bag.all });
      router.push(ROUTES.orderConfirmation(result.order.orderNumber));
    },
    onError: (error) => {
      follow(afterFailure(error, failedReason));
    },
  });

  function onValid(input: CheckoutFormInput): void {
    const shown = quote.data;
    if (shown === undefined || shown === null || quote.isPlaceholderData) return;
    inFlight.current = true;
    setOutcome(null);
    const release = (): void => {
      inFlight.current = false;
    };
    const { deliveryOptionId, totals } = shown;
    place.mutate(
      { ...input, deliveryOptionId, expectedTotalMinor: totals.totalMinor },
      { onSettled: release },
    );
  }

  return {
    form,
    outcome,
    isPlacing: place.isPending,
    warmUp: validation.warmUp,
    onSubmit: (event) => {
      if (inFlight.current) return event.preventDefault();
      void form.handleSubmit(onValid)(event);
    },
  };
}
