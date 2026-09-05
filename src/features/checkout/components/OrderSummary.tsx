import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMoneyMinor } from '@/lib/utils/format';

import type { OrderTotals } from '../schemas/checkout.schema';

export interface OrderSummaryProps {
  totals: OrderTotals;
  locale: Locale;
  messages: Messages;
}

/**
 * The totals, rendered exactly as the backend stated them.
 *
 * No `'use client'`: it holds no state and registers no handler, so it renders
 * on the server and only joins a client bundle because its parent is one
 * (MOD-06). Nothing here adds up — §6.5's `total = subtotal − discount +
 * delivery + gift` is checked at placement and never recalculated (DATA-13).
 */
export function OrderSummary({ totals, locale, messages }: OrderSummaryProps) {
  const t = messages.checkout;

  return (
    <div className="border-border rounded-card border p-4">
      <h2 className="text-fg text-sm font-medium">{t.summaryHeading}</h2>

      <dl className="mt-3 flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-fg-muted">{t.subtotal}</dt>
          <dd className="text-fg">{formatMoneyMinor(totals.subtotalMinor, locale)}</dd>
        </div>

        {totals.discountMinor === 0 ? null : (
          <div className="flex justify-between">
            <dt className="text-fg-muted">{t.discount}</dt>
            <dd className="text-fg">−{formatMoneyMinor(totals.discountMinor, locale)}</dd>
          </div>
        )}

        <div className="flex justify-between">
          <dt className="text-fg-muted">{t.delivery}</dt>
          <dd className="text-fg">
            {totals.deliveryMinor === 0
              ? t.deliveryFree
              : formatMoneyMinor(totals.deliveryMinor, locale)}
          </dd>
        </div>

        {totals.giftMinor === 0 ? null : (
          <div className="flex justify-between">
            <dt className="text-fg-muted">{t.gift}</dt>
            <dd className="text-fg">{formatMoneyMinor(totals.giftMinor, locale)}</dd>
          </div>
        )}

        <div className="border-border mt-2 flex justify-between border-t pt-2 font-medium">
          <dt className="text-fg">{t.total}</dt>
          <dd className="text-fg">{formatMoneyMinor(totals.totalMinor, locale)}</dd>
        </div>
      </dl>
    </div>
  );
}
