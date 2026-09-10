import { z } from 'zod';

import { enteredFromStored, MEASUREMENTS, type Measurement } from '../lib/garments';
import { fromMm, type Unit } from '../lib/units';

/**
 * FORM-01 — one schema for the form, derived from the measurement set rather
 * than written out beside it. A hand-listed schema would be a second copy of the
 * list (PD-01) and would drift the first time a measurement is added.
 *
 * The bounds live on the STORED figure — a chest of 800 to 1500 mm is a
 * circumference — so they are halved back before they are shown to a field that
 * asks for the across reading. FORM-03 makes this copy an AFFORDANCE only; the
 * backend checks again and is the authority (§34.7).
 */

/** Every field is entered as text and STAYS text through validation. */
function fieldSchema(measurement: Measurement, unit: Unit): z.ZodType<string, string> {
  const min = fromMm(enteredFromStored(measurement, measurement.minMm), unit);
  const max = fromMm(enteredFromStored(measurement, measurement.maxMm), unit);

  return z
    .string()
    .trim()
    .min(1)
    .refine((raw) => {
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed >= min && parsed <= max;
    });
}

export function buildMeasurementSchema(unit: Unit) {
  const shape: Record<string, z.ZodType<string, string>> = {};
  for (const measurement of MEASUREMENTS) {
    shape[measurement.id] = fieldSchema(measurement, unit);
  }
  return z.object(shape);
}

/**
 * The form's own values are strings — an input holds text, and an empty field is
 * `''` rather than `NaN`.
 */
export type MeasurementEntry = Record<string, string>;

export const EMPTY_ENTRY: MeasurementEntry = Object.fromEntries(
  MEASUREMENTS.map((measurement) => [measurement.id, '']),
);
