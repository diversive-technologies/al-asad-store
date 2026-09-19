'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMoneyMinor } from '@/lib/utils/format';

import type { CheckoutFormInput } from '../schemas/checkout.schema';

export interface CheckoutGiftOptionsProps {
  form: UseFormReturn<CheckoutFormInput>;
  /** What gift wrapping costs, as the quote stated it. */
  chargeMinor: number;
  locale: Locale;
  messages: Messages;
  onGiftChange: (isGift: boolean) => void;
}

/** §28.2's gift options: the wrapping, and a message revealed only for a gift. */
export function CheckoutGiftOptions({
  form,
  chargeMinor,
  locale,
  messages,
  onGiftChange,
}: CheckoutGiftOptionsProps) {
  const t = messages.checkout;
  const isGift = form.watch('isGift');

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-fg mb-2 text-lg font-medium">{t.giftHeading}</legend>

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="accent-brand-600"
          {...form.register('isGift', {
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
              onGiftChange(event.target.checked);
            },
          })}
        />
        <span className="text-fg text-sm">{t.giftToggle}</span>
        <span className="text-fg-muted text-xs">{formatMoneyMinor(chargeMinor, locale)}</span>
      </label>

      {/* Revealed rather than always present: an empty message box on an order
          that is not a gift is a question nobody asked. */}
      {!isGift ? null : (
        <div className="flex flex-col gap-1">
          <label htmlFor="giftMessage" className="text-fg text-sm">
            {t.giftMessageLabel}
          </label>
          <Input
            id="giftMessage"
            placeholder={t.giftMessagePlaceholder}
            maxLength={200}
            {...form.register('giftMessage')}
          />
        </div>
      )}
    </fieldset>
  );
}
