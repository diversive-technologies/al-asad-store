/**
 * What a half-finished form means.
 *
 * MOD-04 — pure, React-free, unit-testable. A measurement counts as TAKEN only
 * when it holds a figure the field would accept. Counting anything non-empty
 * would light up a mark on the drawing, tick the progress bar and then fail
 * validation on submit, which is three surfaces disagreeing at once — so this
 * asks `acceptsEntry`, the same question the form schema asks.
 */

import type { MeasurementPointId } from '@/lib/domain/ids';

import type { MeasurementPoint } from '../schemas/measurement-set.schema';
import { acceptsEntry } from './conversion';
import type { Unit } from './units';

/** Raw form values, as the fields hold them — strings, possibly absent. */
export type MeasurementEntries = Readonly<Record<string, string | undefined>>;

export function takenIds(
  points: readonly MeasurementPoint[],
  entries: MeasurementEntries,
  unit: Unit,
): ReadonlySet<MeasurementPointId> {
  return new Set(
    points
      .filter((point) => acceptsEntry(point, entries[point.id] ?? '', unit))
      .map((point) => point.id),
  );
}

/** How many of the REQUIRED measurements are taken — optional ones do not count. */
export function requiredTaken(
  points: readonly MeasurementPoint[],
  taken: ReadonlySet<MeasurementPointId>,
): number {
  return points.filter((point) => point.required && taken.has(point.id)).length;
}
