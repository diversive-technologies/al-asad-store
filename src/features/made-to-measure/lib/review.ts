/**
 * The review before a save: what was checked, and the rows it shows.
 *
 * MOD-04 — pure. What the server SAID about a check or a save is judged in
 * `verdicts.ts`.
 */

import type { MeasurementPointId, OptionGroupId } from '@/lib/domain/ids';

import type { Acknowledgement, Preference, TypedPointEntry } from '../schemas/profile.schema';
import { storedFromEntered } from './garments';
import { pointsOf } from './measurement-set';
import type { StudioPiece, StudioPoint, StudioSet } from './studio-set';
import { formatFigure, MM_PER_UNIT, parseEntry } from './units';

/** What a passed check leaves for the review: what was sent, and what each figure records as. */
export interface CheckedMeasurements {
  readonly entries: readonly TypedPointEntry[];
  /** The finishing choices the figures were sent with. */
  readonly preferences: readonly Preference[];
  readonly recorded: ReadonlyMap<MeasurementPointId, number>;
  /** The figures the customer kept after a note, as the SERVER counted them. */
  readonly acknowledged: readonly Acknowledgement[];
}

export interface ReviewRow {
  readonly point: StudioPoint;
  readonly entry: TypedPointEntry;
  readonly valueMm: number;
  /** The customer was asked about this figure and stood by it. */
  readonly kept: boolean;
}

/** A finishing choice as the review states it, by name. */
export interface ReviewChoice {
  readonly id: OptionGroupId;
  readonly group: string;
  readonly value: string;
}

export interface ReviewGroup {
  readonly piece: StudioPiece;
  readonly rows: readonly ReviewRow[];
  /** The choices on this garment — "Cuff style: Double" — so a save shows what it is for. */
  readonly choices: readonly ReviewChoice[];
}

function choicesOn(
  studio: StudioSet,
  preferences: readonly Preference[],
  piece: StudioPiece,
): readonly ReviewChoice[] {
  return preferences.flatMap((preference) => {
    const group = studio.options.find(
      (candidate) => candidate.id === preference.group && candidate.pieceId === piece.id,
    );
    const value = group?.values.find((candidate) => candidate.id === preference.value);
    if (group === undefined || value === undefined) return [];
    return [{ id: group.id, group: group.label, value: value.label }];
  });
}

/*
 * The record is whole millimetres, so it always sits within half a millimetre of
 * the figure the customer meant. Converted straight back it shows that rounding —
 * 24 in came back as 24.02, 18 as 17.99 — which reads as "they changed my
 * number". So where the server's record is within its own rounding of the
 * customer's figure (doubled, for a half), the customer's figure is the honest
 * way to show it. Where it is not — the server holding a different convention
 * for the point — the record speaks for itself, and the difference shows.
 */
const RECORD_ROUNDING_MM = 0.5;

/** The kept figure, in the unit the customer typed in. */
export function keptFigure(row: ReviewRow): number {
  const perUnit = MM_PER_UNIT[row.entry.unit];
  const typed = parseEntry(row.entry.raw);
  if (typed !== null) {
    const meant = storedFromEntered(row.point, typed);
    if (Math.abs(meant * perUnit - row.valueMm) <= RECORD_ROUNDING_MM + 1e-9) return meant;
  }
  return Number(formatFigure(row.valueMm / perUnit, row.entry.unit));
}

/** Garment by garment, in the served order, every figure that was sent and stands. */
export function reviewGroups(
  studio: StudioSet,
  checked: CheckedMeasurements,
): readonly ReviewGroup[] {
  const kept = new Set(checked.acknowledged.map((answer) => answer.pointId));
  return studio.pieces
    .map((piece) => ({
      piece,
      rows: pointsOf(studio.points, piece.id).flatMap((point) => {
        const entry = checked.entries.find((candidate) => candidate.pointId === point.id);
        const valueMm = checked.recorded.get(point.id);
        return entry === undefined || valueMm === undefined
          ? []
          : [{ point, entry, valueMm, kept: kept.has(point.id) }];
      }),
      choices: choicesOn(studio, checked.preferences, piece),
    }))
    .filter((group) => group.rows.length > 0);
}
