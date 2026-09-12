/**
 * Queries over a served measurement list.
 *
 * MOD-04 — pure. Every function takes the list's points as an argument rather
 * than reading a module-level fixture, so the same code serves whichever style
 * the page was asked for, and a test can hand it any list it likes.
 */

import type { MeasurementPieceId, MeasurementPointId } from '@/lib/domain/ids';

import type { MeasurementPoint } from '../schemas/measurement-set.schema';

export function pointsOf<P extends MeasurementPoint>(
  points: readonly P[],
  pieceId: MeasurementPieceId,
): readonly P[] {
  return points.filter((point) => point.pieceId === pieceId);
}

/**
 * The order the form asks in. The stepper, the keyboard's return key, Tab and
 * the error list all move through the list this way; the contract keeps each
 * piece's points together, so it is also the garment-by-garment fieldset order.
 */
export function measuringOrder(points: readonly MeasurementPoint[]): readonly MeasurementPointId[] {
  return points.map((point) => point.id);
}

/** What the progress count and a valid submit are about. */
export function requiredIds(points: readonly MeasurementPoint[]): readonly MeasurementPointId[] {
  return points.filter((point) => point.required).map((point) => point.id);
}

/**
 * The point before or after this one, or null at either end: it does not wrap.
 * Null too for a point the list does not carry, rather than the first one.
 */
export function stepFrom(
  order: readonly MeasurementPointId[],
  id: MeasurementPointId,
  direction: 1 | -1,
): MeasurementPointId | null {
  const at = order.indexOf(id);
  if (at === -1) return null;
  return order[at + direction] ?? null;
}

export function pointById<P extends MeasurementPoint>(
  points: readonly P[],
  id: MeasurementPointId | null,
): P | undefined {
  return points.find((point) => point.id === id);
}
