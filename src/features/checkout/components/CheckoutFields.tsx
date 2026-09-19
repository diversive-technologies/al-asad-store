'use client';

import type { UseFormReturn } from 'react-hook-form';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import type { CheckoutChoices } from '../hooks/use-checkout-quote';
import type { CheckoutFormInput, CheckoutQuote } from '../schemas/checkout.schema';
import { CheckoutAddressFields } from './CheckoutAddressFields';
import { CheckoutContactFields } from './CheckoutContactFields';
import { CheckoutDeliveryOptions } from './CheckoutDeliveryOptions';
import { CheckoutGiftOptions } from './CheckoutGiftOptions';
import { CheckoutPaymentMethods } from './CheckoutPaymentMethods';
import { CheckoutSavedAddress } from './CheckoutSavedAddress';

export interface CheckoutFieldsProps {
  form: UseFormReturn<CheckoutFormInput>;
  quote: CheckoutQuote;
  messages: Messages;
  locale: Locale;
  mobileExample: string;
  /** The two choices that re-price the order, held with the quote rather than the form. */
  choices: CheckoutChoices;
}

/**
 * Every field of §28.2's single-page checkout, in the order they are filled.
 *
 * Each group is its own component, and each renders what the QUOTE sent: the
 * delivery options, the payment methods and whether gifting is offered are all
 * the backend's lists (§3.1, DATA-13), not choices this file makes.
 */
export function CheckoutFields({
  form,
  quote,
  messages,
  locale,
  mobileExample,
  choices,
}: CheckoutFieldsProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* §28.3 — a signed-in customer's saved addresses, above the fields they
          fill. Nothing is drawn for a guest, so guest checkout (§28.2) is the
          page it always was. */}
      <CheckoutSavedAddress form={form} messages={messages} />

      <CheckoutContactFields form={form} messages={messages} mobileExample={mobileExample} />

      <CheckoutAddressFields form={form} messages={messages} />

      <CheckoutDeliveryOptions
        options={quote.deliveryOptions}
        selectedId={choices.deliveryOptionId}
        locale={locale}
        messages={messages}
        onDeliveryChange={choices.onDeliveryChange}
      />

      <CheckoutPaymentMethods form={form} methods={quote.paymentMethods} messages={messages} />

      {!quote.gift.isOffered ? null : (
        <CheckoutGiftOptions
          form={form}
          chargeMinor={quote.gift.chargeMinor}
          locale={locale}
          messages={messages}
          onGiftChange={choices.onGiftChange}
        />
      )}
    </div>
  );
}
