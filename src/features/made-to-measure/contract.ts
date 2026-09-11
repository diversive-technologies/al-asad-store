/**
 * STRUCT-06 — a second, STATIC-ONLY barrel, on the precedent `features/bag` and
 * `features/catalogue` already set.
 *
 * The main barrel re-exports `MeasurementStudio`, which is a Client Component
 * carrying React Hook Form, TanStack Query and the whole studio. A Server
 * Component on another surface that wants only the drawing must not pull that
 * boundary along with it, so the drawing is offered here, on its own.
 *
 * STRUCT-04: a feature may import another feature through a barrel, never by
 * reaching into its internals — which is why this file exists rather than a deep
 * import of `components/GarmentMark`.
 */
export { GarmentMark } from './components/GarmentMark';
export type { GarmentId } from './lib/garments';
