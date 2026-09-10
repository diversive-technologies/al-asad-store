'use client';

import type { CSSProperties } from 'react';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatNumber, formatTemplate } from '@/lib/utils/format';

/**
 * How much of the set is taken.
 *
 * Thirteen fields is a lot to face, and the count is what turns it from a wall
 * into a task with an end. A measurement counts only once it holds a figure the
 * bounds accept, so this and the validation cannot disagree.
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
