'use client';

import { useId, type RefObject } from 'react';

import type { Messages } from '@/i18n/messages/en';
import type { MeasurementPointId } from '@/lib/domain/ids';

import type { PieceGroup } from '../lib/form-view';
import type { CaptureSource } from '../schemas/measurement-set.schema';

export interface NoteSummaryProps {
  readonly groups: readonly PieceGroup[];
  readonly onJump: (id: MeasurementPointId) => void;
  readonly summaryRef: RefObject<HTMLDivElement | null>;
  readonly messages: Messages;
  /** Notes nobody has answered yet: at zero, the way to the review is open. */
  readonly outstanding: number;
  readonly source: CaptureSource;
}

/**
 * The figures worth a second look, in one place, with a way to each.
 *
 * It is NOT the error summary: no `role="alert"`, no danger colour, and nothing
 * here is wrong. It takes focus once after a check that only asks — a check that
 * refuses lands on the red summary instead — and its polite line says when every
 * note has been answered, so a keyboard or screen-reader customer knows the way
 * on is open without hunting down the fields.
 */
export function NoteSummary({
  groups,
  onJump,
  summaryRef,
  messages,
  outstanding,
  source,
}: NoteSummaryProps) {
  const t = messages.madeToMeasure;
  const titleId = useId();
  const onCard = source === 'TAILOR_CARD';
  const lead =
    outstanding === 0
      ? t.noteSummaryDone
      : onCard
        ? t.noteSummaryLeadCard
        : t.noteSummaryLead;

  return (
    <section
      ref={summaryRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      className="border-border rounded-card border p-4"
    >
      <h2 id={titleId} className="text-fg text-sm font-medium">
        {t.noteSummaryTitle}
      </h2>
      <p role="status" className="text-fg-muted mt-1 text-xs">
        {lead}
      </p>
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
                    className="text-fg cursor-pointer py-1 text-xs underline"
                  >
                    {point.label}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
