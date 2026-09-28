/**
 * Test support — the served lists, their wording and the style offers, parsed
 * through the real contracts, so a test runs against the shapes the studio
 * receives rather than a hand-made copy of them. The rows are `test-fixtures.ts`;
 * this is the only door to them. Imported by tests only; nothing in the studio
 * may import it.
 */

import { measurementPointIdSchema, type MeasurementPointId } from '@/lib/domain/ids';
import { styleOffersSchema, type StyleOffers } from '@/lib/domain/style-offer';

import { measurementCopySchema, type MeasurementCopy } from '../schemas/measurement-copy.schema';
import {
  measurementSetSchema,
  type MeasurementPoint,
  type MeasurementSet,
} from '../schemas/measurement-set.schema';
import { joinCopy, type StudioSet } from './studio-set';
import { MEASUREMENT_COPY, SERVED_SETS, STYLE_OFFERS } from './test-fixtures';

/** The styles the studio offers, in the order it offers them. */
export const OFFERS: StyleOffers = styleOffersSchema.parse(STYLE_OFFERS);

/** The studio's wording, in English, for every list `servedSet` serves. */
export const COPY: MeasurementCopy = measurementCopySchema.parse(MEASUREMENT_COPY);

/** One style's current list, on its first path or — for a card — the one named. */
export function servedSet(garmentStyle: string, source?: string): MeasurementSet {
  const served = SERVED_SETS.find(
    (set) => set.garmentStyle === garmentStyle && (source === undefined || set.source === source),
  );
  if (served === undefined) throw new Error(`no ${source ?? 'served'} list for ${garmentStyle}`);
  return measurementSetSchema.parse(served);
}

/**
 * One style's list joined to its words, as the studio, the review and the account
 * page are handed it — through the real contracts, because the ids are BRANDED
 * and a bare string would test a shape the studio never receives.
 */
export function studioFor(garmentStyle: string, source?: string): StudioSet {
  const joined = joinCopy(servedSet(garmentStyle, source), OFFERS, COPY);
  if (!joined.ok) throw new Error(`no wording for ${joined.error.join(', ')}`);
  return joined.value.studio;
}

/** Every point any offered style serves, once each, in first-served order. */
export const EVERY_POINT: readonly MeasurementPoint[] = [
  ...new Map(
    OFFERS.flatMap((offer) => servedSet(offer.garmentStyle).points).map((point) => [
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
