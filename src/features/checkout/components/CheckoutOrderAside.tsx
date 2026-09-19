'use client';

import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import type { CheckoutQuote } from '../schemas/checkout.schema';
import { CutCutoffNotice } from './CutCutoffNotice';
import { OrderSummary } from './OrderSummary';

export interface CheckoutOrderAsideProps {
  quote: CheckoutQuote;
  isPlacing: boolean;
  /** A new quote is being read; the one shown is the previous choices' price. */
  isRequoting: boolean;
  locale: Locale;
  messages: Messages;
}

/**
 * The order's totals beside the form, and the button that spends them.
 *
 * While a changed delivery option or gift box is re-quoted, the previous totals
 * stay and the aside says it is busy, rather than the whole form unmounting into
 * a loading line and throwing a keyboard user's focus to the top of the page.
 */
export function CheckoutOrderAside({
  quote,
  isPlacing,
  isRequoting,
  locale,
  messages,
}: CheckoutOrderAsideProps) {
  const t = messages.checkout;

  return (
    <aside aria-busy={isRequoting} className="lg:sticky lg:top-24 lg:self-start">
      <OrderSummary totals={quote.totals} locale={locale} messages={messages} />

      {/*
       * §34.7 — BEFORE payment and on the same screen as the price, which is where
       * the spec puts it in as many words. It sits between the total and the
       * button that spends it, because that is the moment somebody decides.
       */}
      {quote.madeToMeasure.isPresent ? (
        <CutCutoffNotice
          leadTimeDays={quote.madeToMeasure.leadTimeDays}
          hasOtherItems={quote.madeToMeasure.hasOtherItems}
          locale={locale}
          messages={messages}
        />
      ) : null}

      {/* FORM-06: the latch in `usePlaceOrder` refuses a second submit, so the
          button stays ENABLED and says `aria-busy` — disabling it dropped the
          keyboard focus it held (§30.3), and a refusal then landed on nothing. */}
      <Button type="submit" size="lg" className="mt-4 w-full" isBusy={isPlacing || isRequoting}>
        {isPlacing ? t.placing : t.place}
      </Button>
    </aside>
  );
}
