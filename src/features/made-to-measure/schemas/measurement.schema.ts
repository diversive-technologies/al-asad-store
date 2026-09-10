import { z } from 'zod';

import { MEASUREMENT_POINTS, type MeasurementPoint } from '../lib/measurement-points';
import { fromMm, type Unit } from '../lib/units';

/**
 * FORM-01 — one schema for the form, and it is derived from the measurement set
 * rather than written out beside it. A hand-listed schema would be a second copy
 * of the point list (PD-01) and would drift the first time a point is added.
 *
 * The bounds are the point's own, converted into whatever unit the customer is
 * currently typing in. §34.7 keeps them server-owned; FORM-03 makes this copy an
 * AFFORDANCE only — the backend checks again and is the authority.
 */

/**
 * A field is entered as text and STAYS text through validation.
 *
 * Parsing to a number in the resolver would make the form's input type and its
 * output type disagree, and the conversion that actually matters is to
 * millimetres at submission (ADR 16) — not to a float halfway through.
 */
function pointSchema(point: MeasurementPoint, unit: Unit): z.ZodType<string, string> {
  const min = fromMm(point.minMm, unit);
  const max = fromMm(point.maxMm, unit);

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
  for (const point of MEASUREMENT_POINTS) {
    shape[point.id] = pointSchema(point, unit);
  }
  return z.object(shape);
}

/**
 * The form's own values are strings — an input holds text, and an empty field is
 * `''` rather than `NaN`. The parsed output is the number map above.
 */
export type MeasurementEntry = Record<string, string>;

export const EMPTY_ENTRY: MeasurementEntry = Object.fromEntries(
  MEASUREMENT_POINTS.map((point) => [point.id, '']),
);
