import type { Locale } from '@/i18n/locales';

import { KAMEEZ_CARD_POINTS, SHALWAR_CARD_POINTS } from './measurement-card-points-db';
import { measurementCopyFor } from './measurement-copy-db';
import { KAMEEZ_OPTIONS, type OptionGroupRow } from './measurement-options-db';
import {
  KAMEEZ_POINTS,
  SHALWAR_POINTS,
  WAISTCOAT_POINTS,
  type PointRow,
} from './measurement-points-db';

/**
 * D1 — module 18's served LISTS, standing in for Java: the styles the workshop
 * stitches (A2-4) and the measurement sets per style and way of measuring (§34.5,
 * A2-3, A2-10), built from the point rows in `measurement-points-db.ts` and
 * `measurement-card-points-db.ts` and the finishing choices in
 * `measurement-options-db.ts`. The words for them are Localisation's, in
 * `measurement-copy-db.ts` (§22, §34.3).
 *
 * Shaped as the backend will serve it: ids and shapes, no words. Reordering the
 * rows reorders the form, and nothing in the interface changes. FIXTURE.
 */

export type { PointRow };

/** The ways of measuring, once for the whole stand-in. */
export const SOURCE_ROWS = ['GARMENT_COPY', 'TAILOR_CARD'] as const;
export type SourceRow = (typeof SOURCE_ROWS)[number];

export interface SetRow {
  garmentStyle: string;
  source: SourceRow;
  version: number;
  pieces: { id: string; drawingId: string }[];
  points: PointRow[];
  options: OptionGroupRow[];
}

/** A list as the wire carries it: with every path its style offers. */
export type ServedSetRow = SetRow & { sources: SourceRow[] };

interface StyleOfferRow {
  garmentStyle: string;
  leadTimeDays: number;
  /**
   * §34.8's stitching charge — **FIXTURE**, like every other number in this file.
   *
   * §31 #35 makes it configuration, by garment style, and records it as "To be
   * set". These are ours: plausible Pakistani tailoring prices and nothing more.
   * A charge is the one placeholder a CUSTOMER would pay, so it is the first
   * thing the client has to supply, and it must be named aloud at any demo.
   */
  stitchingChargeMinor: number;
}

const KAMEEZ = { id: 'KAMEEZ', drawingId: 'KAMEEZ' };
const SHALWAR = { id: 'SHALWAR', drawingId: 'SHALWAR' };
const WAISTCOAT = { id: 'WAISTCOAT', drawingId: 'WAISTCOAT' };

/* Every style has a kameez, finished the same way in each, and the garment path
   is listed first — it is what a bare address opens. A card list carries the
   kameez's finishing choices too: there they describe the kameez to be stitched,
   and no card point depends on them. A waistcoat suit has no card path yet:
   whether the waistcoat has its own card is plan question 4. */
const MEASUREMENT_SETS: readonly SetRow[] = [
  {
    garmentStyle: 'KAMEEZ_SHALWAR',
    source: 'GARMENT_COPY',
    version: 1,
    pieces: [KAMEEZ, SHALWAR],
    points: [...KAMEEZ_POINTS, ...SHALWAR_POINTS],
    options: [...KAMEEZ_OPTIONS],
  },
  {
    garmentStyle: 'KAMEEZ_SHALWAR',
    source: 'TAILOR_CARD',
    version: 1,
    pieces: [KAMEEZ, SHALWAR],
    points: [...KAMEEZ_CARD_POINTS, ...SHALWAR_CARD_POINTS],
    options: [...KAMEEZ_OPTIONS],
  },
  {
    garmentStyle: 'WAISTCOAT_SUIT',
    source: 'GARMENT_COPY',
    version: 1,
    pieces: [KAMEEZ, SHALWAR, WAISTCOAT],
    points: [...KAMEEZ_POINTS, ...SHALWAR_POINTS, ...WAISTCOAT_POINTS],
    options: [...KAMEEZ_OPTIONS],
  },
  /* A kurta is one garment, so its lists ask for nothing below the hem. It is
     measured exactly as a kameez is, and drawn as one. */
  {
    garmentStyle: 'KURTA',
    source: 'GARMENT_COPY',
    version: 1,
    pieces: [KAMEEZ],
    points: [...KAMEEZ_POINTS],
    options: [...KAMEEZ_OPTIONS],
  },
  {
    garmentStyle: 'KURTA',
    source: 'TAILOR_CARD',
    version: 1,
    pieces: [KAMEEZ],
    points: [...KAMEEZ_CARD_POINTS],
    options: [...KAMEEZ_OPTIONS],
  },
];

/** In the order the studio offers them; the first is what a bare `/stitched` opens. */
export const STYLE_OFFERS: readonly StyleOfferRow[] = [
  { garmentStyle: 'KAMEEZ_SHALWAR', leadTimeDays: 7, stitchingChargeMinor: 250000 },
  // A third garment to cut and finish, so it costs more and takes longer.
  { garmentStyle: 'WAISTCOAT_SUIT', leadTimeDays: 10, stitchingChargeMinor: 400000 },
  { garmentStyle: 'KURTA', leadTimeDays: 5, stitchingChargeMinor: 180000 },
];

/**
 * A style's NAME in one language, from the served words (I18N-06).
 *
 * The bag needs it to say what a line is cut as, and building it from the code
 * would be the interface authoring a label the backend already owns.
 */
export function styleLabelFor(garmentStyle: string, locale: Locale): string | null {
  return measurementCopyFor(locale).styles[garmentStyle] ?? null;
}

/** Every way a style can be measured, in the order its lists are declared. */
export function sourcesOf(garmentStyle: string): SourceRow[] {
  const sources = MEASUREMENT_SETS.filter((set) => set.garmentStyle === garmentStyle).map(
    (set) => set.source,
  );
  return [...new Set(sources)];
}

/**
 * Every version of one style's list for one path, oldest first.
 *
 * D6: every version is kept, because a saved profile names the version it was
 * typed against and its millimetres were derived from THAT list. A new save must
 * name the current one (`profiles-db.ts`).
 */
export function versionsOf(garmentStyle: string, source: string): readonly SetRow[] {
  return MEASUREMENT_SETS.filter(
    (set) => set.garmentStyle === garmentStyle && set.source === source,
  ).sort((a, b) => a.version - b.version);
}

/* As the wire carries it: every path offered, and a point always asked says so
   with an explicit null. */
const served = (set: SetRow): ServedSetRow => ({
  ...set,
  sources: sourcesOf(set.garmentStyle),
  points: set.points.map((point) => ({ ...point, askedWhen: point.askedWhen ?? null })),
});

/**
 * One style's list for one path: a named version, or — the served read — the
 * current one. The path defaults to the style's first.
 */
export function measurementSetFor(
  garmentStyle: string,
  version?: number,
  source?: string,
): ServedSetRow | null {
  const path = source ?? sourcesOf(garmentStyle)[0];
  if (path === undefined) return null;
  const versions = versionsOf(garmentStyle, path);
  const found =
    version === undefined ? versions.at(-1) : versions.find((set) => set.version === version);
  return found === undefined ? null : served(found);
}

export function styleOfferFor(garmentStyle: string): StyleOfferRow | null {
  return STYLE_OFFERS.find((offer) => offer.garmentStyle === garmentStyle) ?? null;
}
