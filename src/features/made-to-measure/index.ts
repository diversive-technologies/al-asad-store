/**
 * §34 Made-to-Measure.
 *
 * One barrel is enough here: nothing in this feature reaches `next/headers`, so
 * a Client Component can import it without the build failure STRUCT-06 exists to
 * prevent. Should a server-only reader land later, this splits the way
 * `features/catalogue` did.
 */
export { MeasurementStudio } from './components/MeasurementStudio';
export { MEASUREMENT_POINTS, MEASUREMENT_REGIONS } from './lib/measurement-points';
export type { MeasurementPoint, MeasurementPointId } from './lib/measurement-points';
export { DEFAULT_UNIT, fromMm, toMm, UNITS } from './lib/units';
export type { Unit } from './lib/units';
