import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import {
  formatDate,
  formatMoneyMinor,
  formatNumber,
  formatPlural,
  formatTemplate,
} from '@/lib/utils/format';

import type { BagLineStitching } from '../schemas/bag.schema';

export interface StitchedLineDetailProps {
  stitching: BagLineStitching;
  /** The garment's own price, so the charge reads as a component of the line. */
  unitPriceMinor: number;
  locale: Locale;
  messages: Messages;
}

/**
 * §34.8 — what a bag line says when the garment is being CUT.
 *
 * It takes the place of the per-piece size list, because there is no size: what
 * a customer needs instead is which measurements it will be cut from, what the
 * cutting costs, and how long it takes.
 *
 * The charge is shown as its own figure rather than folded into the price, which
 * is what §34.8 means by a LINE COMPONENT — the garment's price stays the
 * garment's price, and the customer can see what they are paying to have it made.
 *
 * §34.7's cut cutoff is named here as well as at checkout. It is stated before
 * payment on the price screen because the spec requires it there; it is stated
 * here because this is where somebody decides to keep it.
 *
 * No `'use client'`: it holds no state and registers no handler, so it renders
 * inside whichever boundary its parent already is (MOD-06).
 */
export function StitchedLineDetail({
  stitching,
  unitPriceMinor,
  locale,
  messages,
}: StitchedLineDetailProps) {
  const t = messages.stitched;

  return (
    <div className="text-fg-muted mt-1 space-y-0.5 text-xs">
      <p className="text-fg">{t.madeToMeasure}</p>

      {/* I18N-06 — one parameterised message, not a label joined to a date. */}
      <p>
        <bdi>
          {formatTemplate(t.fromProfile, {
            style: stitching.styleLabel,
            date: formatDate(stitching.savedAt, locale),
          })}
        </bdi>
      </p>

      <p>
        <bdi>{formatPlural(t.figures, stitching.figureCount, locale)}</bdi>
      </p>

      {/* ADR 18 — said on the LINE, so the refusal at checkout has a line to
          point at. Words and weight in full ink, not the danger red: that measured
          3.88:1 on the dark panel at this size, under A11Y-07's 4.5:1. */}
      {stitching.measurementsChanged ? (
        <p className="text-fg font-semibold">{t.measurementsChanged}</p>
      ) : null}

      {/*
       * The garment's own price beside the charge, so the three figures close.
       * With only "Stitching · Rs 2,500" beside a line total of Rs 11,998, a
       * reader at quantity two had no way to see that the charge is per garment
       * — which is exactly what a LINE COMPONENT means.
       */}
      <p>
        {t.garmentPrice} · {formatMoneyMinor(unitPriceMinor, locale)}
      </p>
      <p>
        {t.charge} · {formatMoneyMinor(stitching.chargeMinor, locale)}
      </p>

      {/* I18N-08: through the locale's own number formatter, not `String`. */}
      <p>{formatTemplate(t.leadTime, { days: formatNumber(stitching.leadTimeDays, locale) })}</p>

      {/* §34.7, where the customer is deciding whether to keep it. */}
      <p className="text-fg">{t.noReturns}</p>
    </div>
  );
}
