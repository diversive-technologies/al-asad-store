'use client';

import type { CSSProperties } from 'react';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatNumber, formatTemplate } from '@/lib/utils/format';

/**
 * How much of the set is taken.
 *
 * A long form is a lot to face, and the count is what turns it from a wall into
 * a task with an end. It counts the REQUIRED measurements only — an optional one
 * left empty is not work outstanding — and a measurement counts only once it
 * holds a figure the bounds accept, so this and the validation cannot disagree.
 */
export function MeasurementProgress({
  done,
  total,
  messages,
  locale,
}: {
  readonly done: number;
  readonly total: number;
  readonly messages: Messages;
  readonly locale: Locale;
}) {
  const t = messages.madeToMeasure;

  // A list with nothing required has no progress to show, and 0 of 0 is NaN%.
  if (total === 0) return null;

  return (
    <div className="min-w-40 flex-1">
      <p className="text-fg-muted mb-1.5 text-xs tabular-nums">
        {formatTemplate(t.progress, {
          done: formatNumber(done, locale),
          total: formatNumber(total, locale),
        })}
      </p>
      <div className="bg-surface-strong rounded-pill h-px overflow-hidden">
        {/* STY-01a — a continuous 0–100 runtime value, so it travels as a custom
            property rather than as a style declaration. */}
        <div
          className="mm-progress-fill"
          style={{ '--mm-progress': `${String((done / total) * 100)}%` } as CSSProperties}
        />
      </div>
    </div>
  );
}
