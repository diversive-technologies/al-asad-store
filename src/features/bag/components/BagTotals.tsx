'use client';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import type { BagSummary } from '../schemas/bag.schema';
import { BagCodeForm } from './BagCodeForm';
import { BagFreeDelivery } from './BagFreeDelivery';
import { BagPriceRows } from './BagPriceRows';

export interface BagTotalsProps {
  summary: BagSummary;
  locale: Locale;
  messages: Messages;
}

/**
 * §28.2's promotional code and free-delivery progress, plus the totals.
 *
 * DATA-13 throughout: not one number here is computed. The subtotal, the
 * discount, the delivery charge, the total, and how much more the customer must
 * spend for free delivery all arrive from Pricing.
 */
export function BagTotals({ summary, locale, messages }: BagTotalsProps) {
  return (
    <div className="flex flex-col gap-3">
      <BagFreeDelivery freeDelivery={summary.freeDelivery} locale={locale} messages={messages} />
      <BagCodeForm appliedCode={summary.pricing.appliedCode} messages={messages} />
      <BagPriceRows pricing={summary.pricing} locale={locale} messages={messages} />
    </div>
  );
}
