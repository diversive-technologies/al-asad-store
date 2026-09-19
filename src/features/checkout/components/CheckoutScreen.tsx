'use client';

import { CLIENT } from '@/config/client';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { useCheckoutQuote } from '../hooks/use-checkout-quote';
import { usePlaceOrder } from '../hooks/use-place-order';
import { CheckoutFields } from './CheckoutFields';
import { CheckoutNotice } from './CheckoutNotice';
import { CheckoutOrderAside } from './CheckoutOrderAside';
import { CheckoutOutcomeAlert } from './CheckoutOutcomeAlert';
import { CheckoutSkeleton } from './CheckoutSkeleton';

export interface CheckoutScreenProps {
  locale: Locale;
  messages: Messages;
}

/**
 * §28.2: "Checkout: single page." Not a wizard, not a stepper.
 *
 * NEXT-14 — the page's own shape is drawn for the FIRST quote only. A re-quote
 * keeps the form on screen with the previous totals (`checkoutQuoteQuery`), so
 * changing delivery or the gift box no longer throws focus to the top of the page.
 *
 * ERR-02 — two different facts, kept apart: a store that could not be reached,
 * and a bag with nothing in it to check out. A refusal that EMPTIED the bag —
 * every hold lapsed — keeps its words above the notice, naming what lapsed.
 */
export function CheckoutScreen({ locale, messages }: CheckoutScreenProps) {
  const t = messages.checkout;
  const { quote, choices } = useCheckoutQuote();
  const { form, outcome, isPlacing, onSubmit, warmUp } = usePlaceOrder(quote, t.failed);

  if (quote.isPending) return <CheckoutSkeleton label={messages.common.loading} />;

  const alert =
    outcome === null ? null : (
      <CheckoutOutcomeAlert outcome={outcome} locale={locale} messages={messages} />
    );

  if (quote.isError || quote.data === null) {
    return (
      <CheckoutNotice
        kind={quote.isError ? 'UNREACHABLE' : 'EMPTY'}
        messages={messages}
        onRetry={() => {
          void quote.refetch();
        }}
      >
        {alert}
      </CheckoutNotice>
    );
  }

  return (
    <section className="page-shell py-10">
      <h1 className="text-fg text-2xl font-semibold">{t.title}</h1>

      {alert}

      <form
        onSubmit={onSubmit}
        onFocus={warmUp}
        // FORM-02: the browser's own validation is off; Zod is the source (FORM-01).
        noValidate
        className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <CheckoutFields
          form={form}
          quote={quote.data}
          messages={messages}
          locale={locale}
          mobileExample={CLIENT.market.mobile.example}
          choices={choices}
        />

        <CheckoutOrderAside
          quote={quote.data}
          isPlacing={isPlacing}
          isRequoting={quote.isPlaceholderData}
          locale={locale}
          messages={messages}
        />
      </form>
    </section>
  );
}
