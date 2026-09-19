import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMoneyMinor, formatPlural } from '@/lib/utils/format';

import type { OrderLine } from '../schemas/checkout.schema';

export interface OrderLineStitchingProps {
  stitching: NonNullable<OrderLine['stitching']>;
  locale: Locale;
  messages: Messages;
}

/**
 * §34.7 — what a garment was cut from, on the record the customer keeps. The
 * figures themselves are the order's snapshot; what belongs here is which
 * measurements they were, so the two can be matched.
 */
export function OrderLineStitching({ stitching, locale, messages }: OrderLineStitchingProps) {
  const t = messages.stitched;

  return (
    <div className="text-fg-muted mt-1 text-xs">
      <p className="text-fg">{t.madeToMeasure}</p>
      <p>
        <bdi>{stitching.styleLabel}</bdi>
      </p>
      <p>
        <bdi>{formatPlural(t.figures, stitching.measurements.length, locale)}</bdi>
      </p>
      <p>
        {t.charge} · {formatMoneyMinor(stitching.chargeMinor, locale)}
      </p>
      <p>{t.noReturns}</p>
    </div>
  );
}
