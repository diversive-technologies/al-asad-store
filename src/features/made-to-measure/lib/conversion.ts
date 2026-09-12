/**
 * The range a field accepts, and showing a figure in the other unit.
 *
 * MOD-04 — pure. The RECORD is the server's: it derives the millimetres from
 * what was typed, in one order — multiplied into millimetres, doubled if written
 * as a half, rounded once (A2-2) — and the browser never makes one. What lives
 * here is the affordance: the range a field states and accepts.
 */

import type { MeasurementPoint as Measurement } from '../schemas/measurement-set.schema';
import { enteredFromStored } from './garments';
import {
  DECIMALS,
  formatFigure,
  MM_PER_UNIT,
  parseEntry,
  showEntry,
  type TypedEntry,
  type Unit,
} from './units';

/*
 * Floating arithmetic leaves 1574.9999999 where 1575 was meant. Six decimal
 * places is far finer than any tape and far coarser than that error, so settling
 * there before a ceiling or a floor stops a whole number being pushed past itself.
 */
function settled(value: number): number {
  return Number(value.toFixed(6));
}

export interface EnteredBounds {
  readonly min: number;
  readonly max: number;
}

/**
 * The range a field accepts, in the figure the customer TYPES — a half, for a
 * half — rounded INWARD to what the unit shows. Rounded to nearest, 330 mm would
 * print as 12.99 in and then refuse the 12.99 it had just printed.
 */
export function enteredBounds(measurement: Measurement, unit: Unit): EnteredBounds {
  const factor = 10 ** DECIMALS[unit];
  const scaled = (mm: number): number =>
    settled((enteredFromStored(measurement, mm) / MM_PER_UNIT[unit]) * factor);

  return {
    min: Math.ceil(scaled(measurement.minMm)) / factor,
    max: Math.floor(scaled(measurement.maxMm)) / factor,
  };
}

/**
 * Whether a typed string is a figure the field accepts. The form, the progress
 * count, the marks on the drawing and the error text all ask this one question,
 * so none of them can disagree about what "measured" means.
 */
export function acceptsEntry(measurement: Measurement, raw: string, unit: Unit): boolean {
  const value = parseEntry(raw);
  if (value === null) return false;
  const { min, max } = enteredBounds(measurement, unit);
  return value >= min && value <= max;
}

/**
 * Whether an out-of-range figure fits if it was written the OTHER way — a whole
 * figure where a half is read, or a half where the whole is. It only answers for
 * a figure that does not fit as written, so it never second-guesses one that
 * does; a length is never halved, so it never answers for one.
 */
export function writtenOtherWay(
  measurement: Measurement,
  raw: string,
  unit: Unit,
): 'LOOKS_WHOLE' | 'LOOKS_HALF' | null {
  const value = parseEntry(raw);
  if (value === null || measurement.kind === 'LENGTH') return null;
  const mm = value * MM_PER_UNIT[unit];
  const fits = (stored: number): boolean =>
    stored >= measurement.minMm && stored <= measurement.maxMm;
  if (measurement.enteredAs === 'HALF') return !fits(mm * 2) && fits(mm) ? 'LOOKS_WHOLE' : null;
  return !fits(mm) && fits(mm * 2) ? 'LOOKS_HALF' : null;
}

/**
 * A typed entry shown in another unit — and never shown as a figure the field
 * would then refuse.
 *
 * The display rounds to nearest while the bounds round inward, so a value ON a
 * limit crossed it: a 33 cm neck showed as 12.99 in beside a 13 in minimum, and a
 * figure the customer never typed failed on submit. An accepted entry whose
 * conversion lands outside is shown at the limit it sits on instead — a move of
 * one display step, a quarter of a millimetre, still inside the stored range.
 * What was typed is untouched; switching back restores it exactly.
 */
export function showAccepted(measurement: Measurement, entry: TypedEntry, target: Unit): string {
  const shown = showEntry(entry, target);
  if (!acceptsEntry(measurement, entry.raw, entry.unit)) return shown;
  if (acceptsEntry(measurement, shown, target)) return shown;

  const value = parseEntry(shown);
  if (value === null) return shown;
  const { min, max } = enteredBounds(measurement, target);
  return formatFigure(value < min ? min : max, target);
}
