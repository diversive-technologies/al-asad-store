'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';

import { useMutation } from '@tanstack/react-query';
import { useForm, type Resolver, type UseFormReturn } from 'react-hook-form';

import { ROUTES } from '@/config/routes';
import { unwrap } from '@/lib/result';
import { onDemandResolver } from '@/lib/utils/on-demand-resolver';

import { lookUpOrder, type CheckoutError } from '../api/checkout-browser';
import type { Order } from '../schemas/checkout.schema';
import type { OrderLookupRequest, StandaloneOrderLookup } from '../schemas/order-lookup.schema';

/*
 * Deliberate code split (IMP-01a, PERF-10): the form's validation is fetched when
 * it is first focused rather than with the page (`onDemandResolver` has the
 * reasoning).
 */
const requestValidation = onDemandResolver<OrderLookupRequest>(() =>
  Promise.all([import('@hookform/resolvers/zod'), import('../schemas/order-lookup.schema')]).then(
    ([{ zodResolver }, { orderLookupRequestSchema }]) => zodResolver(orderLookupRequestSchema),
  ),
);

const standaloneValidation = onDemandResolver<StandaloneOrderLookup>(() =>
  Promise.all([import('@hookform/resolvers/zod'), import('../schemas/order-lookup.schema')]).then(
    ([{ zodResolver }, { standaloneOrderLookupSchema }]) =>
      zodResolver(standaloneOrderLookupSchema),
  ),
);

/** The outcomes the lookup puts into words; a match renders or navigates to the order instead. */
export interface OrderLookupWords {
  readonly notFound: string;
  readonly failed: string;
  readonly rateLimited?: string | undefined;
}

export interface OrderLookupFormValues {
  orderNumber?: string | undefined;
  mobile: string;
}

export interface UseOrderLookupResult {
  form: UseFormReturn<OrderLookupFormValues>;
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
  orderNumber: string | undefined,
  words: OrderLookupWords,
  onFound?: ((order: Order) => void) | undefined,
): UseOrderLookupResult {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  // FORM-06 — a synchronous latch: `isPending` only turns true after a render.
  const inFlight = useRef(false);

  const resolver = (orderNumber !== undefined
    ? requestValidation.resolver
    : standaloneValidation.resolver) as unknown as Resolver<OrderLookupFormValues>;

  const form = useForm<OrderLookupFormValues>({
    resolver,
    defaultValues: orderNumber !== undefined ? { mobile: '' } : { orderNumber: '', mobile: '' },
  });

  const lookUp = useMutation({
    mutationFn: (input: OrderLookupFormValues) => {
      const targetNumber = orderNumber ?? input.orderNumber ?? '';
      return unwrap(lookUpOrder(targetNumber, { mobile: input.mobile }));
    },
    onSuccess: (order) => {
      setNotice(order === null ? words.notFound : null);
      if (order !== null) {
        if (onFound !== undefined) {
          onFound(order);
        } else {
          router.push(ROUTES.orderConfirmation(order.orderNumber));
        }
      }
    },
    // ERR-11 / SEC-07: our copy, never the upstream error text.
    onError: (error: CheckoutError | Error) => {
      if ('kind' in error && error.kind === 'RATE_LIMITED') {
        setNotice(words.rateLimited ?? words.failed);
      } else {
        setNotice(words.failed);
      }
    },
  });

  return {
    form,
    notice,
    isPending: lookUp.isPending,
    warmUp: orderNumber !== undefined ? requestValidation.warmUp : standaloneValidation.warmUp,
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
