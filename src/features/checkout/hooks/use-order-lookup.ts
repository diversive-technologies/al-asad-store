'use client';

import { useRef, useState, type FormEvent } from 'react';

import { useMutation } from '@tanstack/react-query';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { unwrap } from '@/lib/result';
import { onDemandResolver } from '@/lib/utils/on-demand-resolver';

import { lookUpOrder } from '../api/checkout-browser';
import type { Order } from '../schemas/checkout.schema';
import type { OrderLookupRequest } from '../schemas/order-lookup.schema';

/*
 * Deliberate code split (IMP-01a, PERF-10): the form's validation is fetched when
 * it is first focused rather than with the page (`onDemandResolver` has the
 * reasoning).
 */
const validation = onDemandResolver<OrderLookupRequest>(() =>
  Promise.all([import('@hookform/resolvers/zod'), import('../schemas/order-lookup.schema')]).then(
    ([{ zodResolver }, { orderLookupRequestSchema }]) => zodResolver(orderLookupRequestSchema),
  ),
);

/** The two outcomes the lookup puts into words; a match renders the order instead. */
export interface OrderLookupWords {
  readonly notFound: string;
  readonly failed: string;
}

export interface UseOrderLookupResult {
  form: UseFormReturn<OrderLookupRequest>;
  /** What the last attempt came to, in the page's words, or `null`. */
  notice: string | null;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Starts the validation's download; the form calls it when first focused. */
  warmUp: () => void;
}

/* The mutation's own callbacks report the outcome; the promise only settles. */
function settle(): void {}

/**
 * MOD-05 — §28.3's lookup "by number and mobile": the form, the request and its
 * outcome. The mobile goes to the backend, which compares it; nothing here holds
 * the order's own mobile. A wrong mobile and an unknown number are the same
 * `null`, so the words for the two are the same too.
 */
export function useOrderLookup(
  orderNumber: string,
  words: OrderLookupWords,
  onFound: (order: Order) => void,
): UseOrderLookupResult {
  const [notice, setNotice] = useState<string | null>(null);
  // FORM-06 — a synchronous latch: `isPending` only turns true after a render.
  const inFlight = useRef(false);

  const form = useForm<OrderLookupRequest>({
    resolver: validation.resolver,
    defaultValues: { mobile: '' },
  });

  const lookUp = useMutation({
    mutationFn: (input: OrderLookupRequest) => unwrap(lookUpOrder(orderNumber, input)),
    onSuccess: (order) => {
      setNotice(order === null ? words.notFound : null);
      if (order !== null) onFound(order);
    },
    // ERR-11 / SEC-07: our copy, never the upstream error text.
    onError: () => {
      setNotice(words.failed);
    },
  });

  return {
    form,
    notice,
    isPending: lookUp.isPending,
    warmUp: validation.warmUp,
    /* Composed inside the handler, so the latch is only read in an event handler,
       and released on every path a submit can take — a refused form included. */
    onSubmit: (event) => {
      if (inFlight.current) return event.preventDefault();
      inFlight.current = true;
      void form
        .handleSubmit((input) => lookUp.mutateAsync(input).then(settle, settle))(event)
        .finally(() => {
          inFlight.current = false;
        });
    },
  };
}
