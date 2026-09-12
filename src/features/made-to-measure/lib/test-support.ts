/**
 * Test support — the served lists, parsed through the real contract, so a test
 * runs against the shapes the studio receives rather than a hand-made copy of
 * them. Imported by tests only; nothing in the studio may import it, since it
 * carries the mock's fixture rows with it.
 */

import { measurementPointIdSchema, type MeasurementPointId } from '@/lib/domain/ids';
import { measurementSetFor, STYLE_OFFERS } from '@/lib/mocks/measurement-sets-db';

import {
  measurementSetSchema,
  type MeasurementPoint,
  type MeasurementSet,
} from '../schemas/measurement-set.schema';

/** One style's current list, on its first path or — for a card — the one named. */
export function servedSet(garmentStyle: string, source?: string): MeasurementSet {
  return measurementSetSchema.parse(measurementSetFor(garmentStyle, undefined, source));
}

/** Every point any offered style serves, once each, in first-served order. */
export const EVERY_POINT: readonly MeasurementPoint[] = [
  ...new Map(
    STYLE_OFFERS.flatMap((offer) => servedSet(offer.garmentStyle).points).map((point) => [
      point.id,
      point,
    ]),
  ).values(),
];

export function pointId(value: string): MeasurementPointId {
  return measurementPointIdSchema.parse(value);
}

export function pointOf(id: string): MeasurementPoint {
  const point = EVERY_POINT.find((candidate) => candidate.id === id);
  if (point === undefined) throw new Error(`no measurement ${id}`);
  return point;
}
