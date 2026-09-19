'use client';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMoneyMinor } from '@/lib/utils/format';

import type { DeliveryOption } from '../schemas/checkout.schema';

export interface CheckoutDeliveryOptionsProps {
  options: readonly DeliveryOption[];
  /** The option shown chosen (`CheckoutChoices.deliveryOptionId`). */
  selectedId: string | null;
  locale: Locale;
  messages: Messages;
  onDeliveryChange: (id: string) => void;
}

/**
 * §28.2's delivery choice — each option priced and described by the backend
 * (DATA-13), and the one first shown chosen is the backend's too.
 *
 * Not a form field: the choice belongs to the QUOTE it re-prices, and placement
 * sends the option that quote was priced with. One `name` keeps the radios one
 * group, so the arrow keys move between them.
 */
export function CheckoutDeliveryOptions({
  options,
  selectedId,
  locale,
  messages,
  onDeliveryChange,
}: CheckoutDeliveryOptionsProps) {
  const t = messages.checkout;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-fg mb-2 text-lg font-medium">{t.deliveryHeading}</legend>

      {options.map((option) => (
        <label
          key={option.id}
          className="border-border rounded-card hover:border-brand-600 flex cursor-pointer items-start gap-3 border p-3"
        >
          <input
            type="radio"
            name="deliveryOptionId"
            value={option.id}
            checked={option.id === selectedId}
            onChange={() => {
              // Re-quote: the charge changes the total, and the total
              // decides which payment methods are offered (§17).
              onDeliveryChange(option.id);
            }}
            className="accent-brand-600 mt-0.5"
          />
          <span className="flex-1">
            <span className="text-fg block text-sm">{option.label}</span>
            <span className="text-fg-muted block text-xs">{option.description}</span>
          </span>
          <span className="text-fg text-sm">
            {option.chargeMinor === 0
              ? t.deliveryFree
              : formatMoneyMinor(option.chargeMinor, locale)}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
