/**
 * What a half-finished form means.
 *
 * MOD-04 — pure, React-free, unit-testable. The rule it holds is one line long
 * and easy to get subtly wrong in a component: a measurement counts as TAKEN
 * only when it holds a figure the bounds would accept. Counting anything
 * non-empty would light up a mark on the drawing, tick the progress bar and then
 * fail validation on submit, which is three surfaces disagreeing at once.
 */

import { enteredFromStored, MEASUREMENTS, type MeasurementId } from './garments';
import { fromMm, type Unit } from './units';

/** Raw form values, as the fields hold them — strings, possibly absent. */
export type MeasurementEntries = Partial<Readonly<Record<MeasurementId, string>>>;

export function takenIds(entries: MeasurementEntries, unit: Unit): ReadonlySet<MeasurementId> {
  return new Set(
    MEASUREMENTS.filter((measurement) => {
      const raw = entries[measurement.id];
      if (raw === undefined || raw.trim() === '') return false;

      const parsed = Number(raw);
      // The bounds are stated on the STORED figure, so a ring's circumference is
      // halved back before it is compared with what the customer typed.
      return (
        Number.isFinite(parsed) &&
        parsed >= fromMm(enteredFromStored(measurement, measurement.minMm), unit) &&
        parsed <= fromMm(enteredFromStored(measurement, measurement.maxMm), unit)
      );
    }).map((measurement) => measurement.id),
  );
}
