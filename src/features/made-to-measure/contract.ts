/**
 * STRUCT-06 — a second, STATIC-ONLY barrel, on the precedent `features/bag` and
 * `features/catalogue` already set.
 *
 * The main barrel re-exports `StitchedScreen`, which reads the backend on the
 * server. A surface elsewhere that wants only the drawing must not pull that
 * along with it, so the drawing is offered here, on its own. The style offer both
 * features read lives in `lib/domain/style-offer.ts` (STRUCT-05), not here.
 *
 * STRUCT-04: a feature may import another feature through a barrel, never by
 * reaching into its internals — which is why this file exists rather than a deep
 * import of `components/GarmentMark`.
 */
export { GarmentMark } from './components/GarmentMark';
export type { DrawingId } from './lib/garment-drawings';
