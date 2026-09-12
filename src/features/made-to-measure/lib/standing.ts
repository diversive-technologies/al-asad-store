/**
 * Whether the figures an answer was about are still the figures on screen.
 *
 * The server answers about the figures it was sent, so its answer holds exactly
 * as long as they do: change the chest and the hem's "smaller than the Chest"
 * goes, and so does a note the customer kept a figure against.
 *
 * The basis is what was TYPED — the figure and the unit it was typed in — not
 * what the field shows, because a unit switch rewrites every field
 * (`switchUnit`). Keyed on the display, toggling inches and centimetres would
 * quietly drop every note and every kept figure, and loop the customer back
 * through the same question.
 *
 * MOD-04 — pure.
 */

import type { MeasurementPoint } from '../schemas/measurement-set.schema';
import type { TypedPointEntry } from '../schemas/profile.schema';
import { showAccepted } from './conversion';
import { normaliseDigits, showEntry, type TypedEntry, type Unit } from './units';

/** The figures an answer was about, as they were sent. A point with no figure is null. */
export type FigureBasis = ReadonlyMap<string, TypedEntry | null>;

export function basisOf(
  about: readonly string[],
  sent: readonly TypedPointEntry[],
): FigureBasis {
  return new Map(
    about.map((pointId) => {
      const entry = sent.find((candidate) => candidate.pointId === pointId);
      return [pointId, entry === undefined ? null : { raw: entry.raw, unit: entry.unit }];
    }),
  );
}

/** What the field would be showing, in this unit, if nobody had touched it. */
function asShown(
  entry: TypedEntry,
  point: MeasurementPoint | undefined,
  unit: Unit,
): string {
  if (entry.unit === unit) return entry.raw;
  return point === undefined ? showEntry(entry, unit) : showAccepted(point, entry, unit);
}

export function figuresStand(
  basis: FigureBasis,
  points: readonly MeasurementPoint[],
  values: Readonly<Record<string, string | undefined>>,
  unit: Unit,
): boolean {
  /* Both sides are read as the same figure would be SENT: what the customer typed
     on an Urdu keyboard, or as a card writes a half, is the figure the server was
     given (`typedEntriesOf`). Compared character for character, ۱۹٫۵ could never
     equal the 19.5 it was sent as, and every finding about that field would be
     judged gone the moment it arrived. */
  for (const [pointId, entry] of basis) {
    const shown = normaliseDigits(values[pointId] ?? '').trim();
    if (entry === null) {
      if (shown !== '') return false;
      continue;
    }
    const point = points.find((candidate) => candidate.id === pointId);
    if (shown !== normaliseDigits(asShown(entry, point, unit)).trim()) return false;
  }
  return true;
}
