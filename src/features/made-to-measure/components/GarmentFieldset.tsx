'use client';

import type { ReactNode } from 'react';

import { useMessages } from '@/i18n/use-messages';
import type { MeasurementPointId } from '@/lib/domain/ids';
import { formatTemplate } from '@/lib/utils/format';

import type { UseMeasurementFormResult } from '../hooks/use-measurement-form';
import type { StudioPiece, StudioPoint } from '../lib/studio-set';
import { unitSuffix } from '../lib/units';
import { MeasurementField, type FieldStatus } from './MeasurementField';

export interface GarmentFieldsetProps {
  readonly piece: StudioPiece;
  /** This piece's points as asked, in the served order. */
  readonly points: readonly StudioPoint[];
  readonly measuring: UseMeasurementFormResult;
  readonly activeId: MeasurementPointId | null;
  readonly onActivate: (id: MeasurementPointId) => void;
  /** What the server said about each field — see `formView`. */
  readonly statusOf: (id: MeasurementPointId) => FieldStatus;
  /** The garment's finishing choices, drawn under its legend and above its fields. */
  readonly children?: ReactNode;
}

/**
 * One garment's measurements, grouped under its own legend.
 *
 * The grouping is not decoration: every field in one list gives no clue which
 * garment to fetch off the shelf next, and a `<fieldset>` is what tells a screen
 * reader the same thing the heading tells everyone else (A11Y-11). The legend is
 * the served garment name, shown as written — I18N-09 keeps a protected term out
 * of re-casing, so it is not set in capitals.
 */
export function GarmentFieldset({
  piece,
  points,
  measuring,
  activeId,
  onActivate,
  statusOf,
  children,
}: GarmentFieldsetProps) {
  const t = useMessages().madeToMeasure;
  const suffix = unitSuffix(measuring.unit, t);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-fg-muted border-border mb-3 w-full border-b pb-2 text-xs font-medium">
        {piece.label}
      </legend>

      {children}

      {points.map((point) => (
        <MeasurementField
          key={point.id}
          id={point.id}
          text={{
            /* I18N-06 — one parameterised message, never a label plus a suffix. */
            label: point.required
              ? point.label
              : formatTemplate(t.optionalLabel, { label: point.label }),
            instruction: point.instruction,
            unitSuffix: suffix,
          }}
          status={statusOf(point.id)}
          isActive={point.id === activeId}
          registration={measuring.form.register(point.id)}
          onActivate={() => {
            onActivate(point.id);
          }}
        />
      ))}
    </fieldset>
  );
}
