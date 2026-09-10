'use client';

import type { RefObject } from 'react';

import type { Messages } from '@/i18n/messages/en';

import type { MeasurementId } from '../lib/garments';

/**
 * FORM-05 — what is wrong, in one place, with a way to each of them.
 *
 * It takes focus after a failed submit rather than the first bad field: with
 * thirteen required measurements, landing in one empty box says nothing about
 * the other twelve. Each entry is a button rather than an anchor because it
 * moves focus and changes the drawing — it does not navigate.
 */
export function MeasurementErrorSummary({
  ids,
  onJump,
  summaryRef,
  messages,
}: {
  readonly ids: readonly MeasurementId[];
  readonly onJump: (id: MeasurementId) => void;
  readonly summaryRef: RefObject<HTMLDivElement | null>;
  readonly messages: Messages;
}) {
  const t = messages.madeToMeasure;

  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role="alert"
      className="border-danger-500/40 bg-danger-500/10 rounded-card border p-4"
    >
      <h2 className="text-danger-500 text-sm font-medium">{t.errorSummaryTitle}</h2>
      <ul className="mt-2 flex flex-col gap-1">
        {ids.map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => {
                onJump(id);
              }}
              className="text-fg-muted hover:text-fg cursor-pointer text-xs underline"
            >
              {t.points[id].label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
