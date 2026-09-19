import type { Locale } from '@/i18n/locales';
import { formatNumber } from '@/lib/utils/format';

export interface StitchingEntryStepsProps {
  steps: readonly string[];
  locale: Locale;
}

/**
 * The stage's three steps, in order.
 *
 * A11Y-11: an ordered list, because order is their content. The numbering is
 * argued rather than assumed — you cannot measure a garment you have not laid
 * flat, and the workshop cannot cut before you have measured, so the sequence IS
 * the rebuttal to the objection the customer actually has ("surely this needs an
 * appointment").
 *
 * The bordered pill around each digit was a container drawn round a numeral. The
 * figure is set as type instead, in the same gold the rings on the drawings are
 * stroked in.
 */
export function StitchingEntrySteps({ steps, locale }: StitchingEntryStepsProps) {
  return (
    <ol className="mt-8 flex w-full flex-col gap-6 sm:flex-row sm:gap-8 md:mt-12">
      {steps.map((step, index) => (
        // CMP-10: the step's own text is its stable identity.
        <li key={step} className="flex flex-1 items-baseline gap-4">
          {/* I18N-08: a figure, so it goes through the locale formatter. */}
          <span aria-hidden className="text-accent-400 shrink-0 text-xl font-semibold tabular-nums">
            {formatNumber(index + 1, locale)}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}
