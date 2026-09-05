'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button, ButtonLink } from '@/components/ui/button';
import { CLIENT } from '@/config/client';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';
import { formatTemplate } from '@/lib/utils/format';

import { fetchQuote, placeOrder } from '../api/checkout-browser';
import {
  checkoutFormSchema,
  type CheckoutFormInput,
  type OrderTotals,
  type PlaceOrderResult,
} from '../schemas/checkout.schema';
import { CheckoutFields } from './CheckoutFields';
import { OrderSummary } from './OrderSummary';

export interface CheckoutScreenProps {
  locale: Locale;
  messages: Messages;
}

/** §28.2: "Checkout: single page." Not a wizard, not a stepper. */
export function CheckoutScreen({ locale, messages }: CheckoutScreenProps) {
  const t = messages.checkout;
  const router = useRouter();

  /*
   * Two fields drive a re-quote, because both change the total — and the total
   * is what decides whether Cash on Delivery is offered at all (§17). They are
   * held here rather than read from the form, so the query key is a plain value
   * and the quote does not refetch on every keystroke elsewhere in the form.
   */
  const [deliveryOptionId, setDeliveryOptionId] = useState('standard');
  const [isGift, setIsGift] = useState(false);
  const [outcome, setOutcome] = useState<PlaceOrderResult | null>(null);

  const quote = useQuery({
    queryKey: queryKeys.checkout.quote(deliveryOptionId, isGift),
    queryFn: ({ signal }) => unwrap(fetchQuote(deliveryOptionId, isGift, signal)),
    // DATA-09: a quote reflects live stock, a live promotion and a cap the
    // operator can change. There is no interval over which it is safe to reuse.
    staleTime: 0,
    retry: false,
  });

  // FORM-01 / FORM-02: one Zod schema, React Hook Form, `zodResolver`.
  const form = useForm<CheckoutFormInput>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      contactName: '',
      contactMobile: '',
      contactEmail: '',
      addressLine: '',
      addressCity: '',
      deliveryOptionId: 'standard',
      paymentMethodId: '',
      isGift: false,
      giftMessage: '',
    },
  });

  const place = useMutation({
    mutationFn: (input: CheckoutFormInput & { expectedTotalMinor: number }) =>
      unwrap(placeOrder(input)),
    onSuccess: (result: PlaceOrderResult) => {
      if (result.kind === 'PLACED') {
        /*
         * The order number is the address (§28.3), so this is a navigation
         * rather than a state change — the customer can bookmark it, share it,
         * and come back to it.
         */
        router.push(ROUTES.orderConfirmation(result.order.orderNumber));
        return;
      }

      /*
       * §7.2's two rollback paths, plus a failed authorisation. None is an
       * error to be swallowed: each is rendered with what it carries — the
       * items that lapsed, or the total that moved.
       */
      setOutcome(result);
      if (result.kind === 'PRICE_CHANGED') void quote.refetch();
    },
    onError: () => {
      setOutcome({ kind: 'PAYMENT_FAILED', reason: t.failed });
    },
  });

  function onSubmit(input: CheckoutFormInput): void {
    const totals = quote.data?.totals;
    if (totals === undefined) return;

    setOutcome(null);
    /*
     * `expectedTotalMinor` is what arms §7.2 step 2. The customer is submitting
     * against a total they were SHOWN, and the backend refuses if it has moved.
     */
    place.mutate({ ...input, expectedTotalMinor: totals.totalMinor });
  }

  if (quote.isPending) {
    return <p className="page-shell text-fg-muted py-16">{messages.common.loading}</p>;
  }

  // A 404 from the quote means an empty bag: there is nothing to check out, and
  // that is a state to explain rather than an error to report.
  if (quote.isError || quote.data === undefined) {
    return (
      <section className="page-shell max-w-xl py-16">
        <h1 className="text-fg text-2xl font-semibold">{t.emptyTitle}</h1>
        <p className="text-fg-muted mt-3">{t.emptyBody}</p>
        <div className="mt-6">
          <ButtonLink href={ROUTES.catalogue.list} variant="primary">
            {t.browse}
          </ButtonLink>
        </div>
      </section>
    );
  }

  const totals: OrderTotals = quote.data.totals;

  return (
    <section className="page-shell py-10">
      <h1 className="text-fg text-2xl font-semibold">{t.title}</h1>

      {outcome === null || outcome.kind === 'PLACED' ? null : (
        // A11Y-05 / ERR-04: announced, and specific about what happened.
        <div
          role="alert"
          className="border-danger-500 bg-surface-muted rounded-card mt-6 border p-4"
        >
          <h2 className="text-fg text-sm font-medium">
            {outcome.kind === 'RESERVATION_EXPIRED' ? t.expiredTitle : t.priceChangedTitle}
          </h2>
          <p className="text-fg-muted mt-1 text-sm">
            {outcome.kind === 'RESERVATION_EXPIRED'
              ? formatTemplate(t.expiredBody, { items: outcome.expiredItems.join(', ') })
              : outcome.kind === 'PRICE_CHANGED'
                ? t.priceChangedBody
                : outcome.reason}
          </p>
          {outcome.kind === 'RESERVATION_EXPIRED' ? (
            <div className="mt-3">
              <ButtonLink href={ROUTES.bag} variant="secondary">
                {t.backToBag}
              </ButtonLink>
            </div>
          ) : null}
        </div>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        // FORM-02: the browser's own validation is off; Zod is the source (FORM-01).
        noValidate
        className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <CheckoutFields
          form={form}
          quote={quote.data}
          messages={messages}
          locale={locale}
          mobileExample={CLIENT.market.mobile.example}
          onDeliveryChange={setDeliveryOptionId}
          onGiftChange={setIsGift}
        />

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary totals={totals} locale={locale} messages={messages} />

          {/* FORM-06: disabled and `aria-busy` in flight, so a double submit
              cannot place two orders. */}
          <Button type="submit" size="lg" className="mt-4 w-full" isLoading={place.isPending}>
            {place.isPending ? t.placing : t.place}
          </Button>
        </aside>
      </form>
    </section>
  );
}
