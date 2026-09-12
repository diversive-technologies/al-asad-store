'use client';

import type { RefObject } from 'react';

import type { Messages } from '@/i18n/messages/en';
import type { MeasurementPointId } from '@/lib/domain/ids';

import type { PieceGroup } from '../lib/form-view';

export interface MeasurementErrorSummaryProps {
  readonly groups: readonly PieceGroup[];
  readonly onJump: (id: MeasurementPointId) => void;
  readonly summaryRef: RefObject<HTMLDivElement | null>;
  readonly messages: Messages;
}

/**
 * FORM-05 — what is wrong, in one place, with a way to each of them.
 *
 * It takes focus after a failed submit rather than the first bad field: with
 * a form this long, landing in one empty box says nothing about the others.
 * Each entry is a button rather than an anchor because it moves focus and
 * changes the drawing — it does not navigate.
 *
 * Grouped by garment, because a suit is several garments and the list reads as
 * a walk round them. `role="list"` because Safari drops list semantics from a
 * styled list; each button is padded to a 24px target, since these are tapped.
 */
export function MeasurementErrorSummary({
  groups,
  onJump,
  summaryRef,
  messages,
}: MeasurementErrorSummaryProps) {
  const t = messages.madeToMeasure;

  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role="alert"
      className="border-danger-500/40 bg-danger-500/10 rounded-card border p-4"
    >
      <h2 className="text-danger-500 text-sm font-medium">{t.errorSummaryTitle}</h2>
      <ul role="list" className="mt-3 flex flex-col gap-3">
        {groups.map(({ piece, points }) => (
          <li key={piece.id}>
            <p className="text-fg-muted text-xs font-medium">{piece.label}</p>
            <ul role="list" className="flex flex-wrap gap-x-4">
              {points.map((point) => (
                <li key={point.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onJump(point.id);
                    }}
                    className="text-fg-muted hover:text-fg cursor-pointer py-1 text-xs underline"
                  >
                    {point.label}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
