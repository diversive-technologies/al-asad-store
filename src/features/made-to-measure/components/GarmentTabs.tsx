'use client';

import type { MeasurementPieceId } from '@/lib/domain/ids';
import { cn } from '@/lib/utils/cn';

import type { StudioPiece } from '../lib/studio-set';

/**
 * Which garment is on the table.
 *
 * Radios rather than buttons (A11Y-11): mutually exclusive choices with one in
 * force, which is what a radio group means. The input itself is `sr-only`, so
 * the focus ring is borrowed onto the label that is visible. A style with one
 * piece has nothing to choose between, so nothing is drawn.
 */
export function GarmentTabs({
  pieces,
  current,
  onChoose,
  legend,
}: {
  readonly pieces: readonly StudioPiece[];
  readonly current: MeasurementPieceId;
  readonly onChoose: (piece: MeasurementPieceId) => void;
  readonly legend: string;
}) {
  if (pieces.length < 2) return null;

  return (
    <fieldset className="mm-tabs">
      <legend className="sr-only">{legend}</legend>
      {pieces.map((piece) => (
        <label key={piece.id} className={cn('mm-tab', piece.id === current && 'mm-tab--on')}>
          <input
            type="radio"
            name="garment"
            value={piece.id}
            checked={piece.id === current}
            onChange={() => {
              onChoose(piece.id);
            }}
            className="sr-only"
          />
          {piece.label}
        </label>
      ))}
    </fieldset>
  );
}
