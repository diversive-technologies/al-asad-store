import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMoneyMinor } from '@/lib/utils/format';

import type { BagPricing } from '../schemas/bag.schema';

export interface BagPriceRowsProps {
  pricing: BagPricing;
  locale: Locale;
  messages: Messages;
}

/**
 * The bag's totals, exactly as Pricing stated them. DATA-13: not one number here
 * is computed — the subtotal, the discount, the delivery charge and the total
 * all arrive from the backend.
 */
export function BagPriceRows({ pricing, locale, messages }: BagPriceRowsProps) {
  const t = messages.bag;

  return (
    <dl className="flex flex-col gap-1 text-sm">
      <div className="flex justify-between">
        <dt className="text-fg-muted">{t.subtotal}</dt>
        <dd className="text-fg">{formatMoneyMinor(pricing.subtotalMinor, locale)}</dd>
      </div>

      {pricing.discountMinor === 0 ? null : (
        <div className="flex justify-between">
          <dt className="text-fg-muted">{t.discount}</dt>
          <dd className="text-fg">−{formatMoneyMinor(pricing.discountMinor, locale)}</dd>
        </div>
      )}

      <div className="flex justify-between">
        <dt className="text-fg-muted">{t.delivery}</dt>
        <dd className="text-fg">
          {pricing.deliveryMinor === 0
            ? t.deliveryFree
            : formatMoneyMinor(pricing.deliveryMinor, locale)}
        </dd>
      </div>

      <div className="border-border mt-1 flex justify-between border-t pt-2 font-medium">
        <dt className="text-fg">{t.total}</dt>
        <dd className="text-fg">{formatMoneyMinor(pricing.totalMinor, locale)}</dd>
      </div>
    </dl>
  );
}
