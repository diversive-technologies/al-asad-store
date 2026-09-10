/**
 * §34 Made-to-Measure.
 *
 * One barrel is enough: nothing here reaches `next/headers`, so a Client
 * Component can import it without the build failure STRUCT-06 exists to prevent.
 */
export { MeasurementStudio } from './components/MeasurementStudio';
export { GARMENTS, MEASUREMENTS, measurementsFor } from './lib/garments';
export type { GarmentId, Measurement, MeasurementId } from './lib/garments';
export { DEFAULT_UNIT, fromMm, toMm, UNITS } from './lib/units';
export type { Unit } from './lib/units';
