import { onDemandResolver, type OnDemandResolver } from '@/lib/utils/on-demand-resolver';

import type { MeasurementEntry } from '../schemas/measurement.schema';
import type { MeasurementPoint } from '../schemas/measurement-set.schema';
import type { Unit } from './units';

/*
 * Deliberate code split (IMP-01a, PERF-10): the form's schema is built from the
 * served list and the unit, as it always was, but it and Zod are fetched when
 * the form is first focused rather than with the page (`onDemandResolver` has
 * the reasoning). The modules are cached once fetched, so building the schema
 * on every render costs what it did before.
 */
export function measurementValidation(
  points: readonly MeasurementPoint[],
  unit: Unit,
): OnDemandResolver<MeasurementEntry> {
  return onDemandResolver(() =>
    Promise.all([import('@hookform/resolvers/zod'), import('../schemas/measurement.schema')]).then(
      ([{ zodResolver }, { buildMeasurementSchema }]) =>
        zodResolver(buildMeasurementSchema(points, unit)),
    ),
  );
}
