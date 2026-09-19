import type { CSSProperties } from 'react';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMoneyMinor, formatTemplate } from '@/lib/utils/format';

import type { FreeDeliveryProgress } from '../schemas/bag.schema';

export interface BagFreeDeliveryProps {
  freeDelivery: FreeDeliveryProgress;
  locale: Locale;
  messages: Messages;
}

/**
 * §28.2 free-delivery progress. A11Y-06: the bar is never the only carrier — the
 * sentence above it says the same thing in words.
 *
 * DATA-13: the bar is a rendering of `remainingMinor`, not a calculation from a
 * threshold this file knows.
 */
export function BagFreeDelivery({ freeDelivery, locale, messages }: BagFreeDeliveryProps) {
  const t = messages.bag;

  /*
   * The progress bar's width. `Math.min` guards the rendering only — the numbers
   * are the backend's; this cannot report more than a full bar even if a future
   * promotion makes `remainingMinor` exceed the threshold.
   */
  const progressPercent = freeDelivery.isMet
    ? 100
    : Math.min(
        100,
        Math.round(
          ((freeDelivery.thresholdMinor - freeDelivery.remainingMinor) /
            freeDelivery.thresholdMinor) *
            100,
        ),
      );

  return (
    <div>
      <p className="text-fg-muted text-xs">
        {freeDelivery.isMet
          ? t.freeDeliveryMet
          : formatTemplate(t.freeDeliveryRemaining, {
              amount: formatMoneyMinor(freeDelivery.remainingMinor, locale),
            })}
      </p>
      <div
        className="bg-surface-strong mt-1.5 h-1 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        /* A11Y-04 — a name that is true whether or not it has been earned. This
           read "You have free delivery" under a sentence saying how much more to
           spend; the sentence above says which it is. */
        aria-label={t.freeDeliveryProgressLabel}
      >
        {/*
         * STY-01a — a genuinely dynamic value that cannot be enumerated at build
         * time, so it is passed as a CSS CUSTOM PROPERTY rather than as a style
         * declaration. The `as` is the TS-03(4) modelling gap: React's
         * `CSSProperties` has no index signature for custom properties.
         */}
        <div
          className="bag-progress bg-brand-600 h-full transition-[inline-size] duration-500 motion-reduce:transition-none"
          style={{ '--bag-progress': `${String(progressPercent)}%` } as CSSProperties}
        />
      </div>
    </div>
  );
}
