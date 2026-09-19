import { z } from 'zod';

import { acceptsEntry } from '../lib/conversion';
import type { Unit } from '../lib/units';
import type { MeasurementPoint } from './measurement-set.schema';

/**
 * FORM-01 — one schema for the form, derived from the served measurement list
 * rather than written out beside it. A hand-listed schema would be a second copy
 * of the list (PD-01) and would drift the first time a point is added.
 *
 * The bounds live on the STORED figure and are turned into the range the field
 * accepts by `acceptsEntry` — the one question the progress count and the marks
 * ask too. FORM-03 makes this copy an AFFORDANCE only; the backend checks again
 * and is the authority (§34.7).
 *
 * An optional measurement may be left empty; once anything is typed, it has to
 * be a figure in range like any other.
 */

/** Every field is entered as text and STAYS text through validation. */
function fieldSchema(point: MeasurementPoint, unit: Unit): z.ZodType<string, string> {
  const text = z.string().trim();
  return point.required
    ? text.min(1).refine((raw) => acceptsEntry(point, raw, unit))
    : text.refine((raw) => raw === '' || acceptsEntry(point, raw, unit));
}

export type MeasurementSchema = z.ZodObject<Record<string, z.ZodType<string, string>>>;

export function buildMeasurementSchema(
  points: readonly MeasurementPoint[],
  unit: Unit,
): MeasurementSchema {
  const shape: Record<string, z.ZodType<string, string>> = {};
  for (const point of points) {
    shape[point.id] = fieldSchema(point, unit);
  }
  return z.object(shape);
}

/**
 * The form's own values are strings — an input holds text, and an empty field is
 * `''` rather than `NaN`. The empty form is `emptyEntry` in `lib/entries.ts`,
 * which carries no Zod, so the studio can draw its fields before this module
 * has been downloaded (PERF-10).
 */
export type MeasurementEntry = Record<string, string>;
