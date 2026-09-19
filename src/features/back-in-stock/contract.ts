/**
 * STRUCT-06 — the CLIENT-SAFE half of this feature's public surface.
 *
 * `index.ts` reaches the backend through `apiRequest`, which is `server-only`, so
 * a Client Component importing it fails the build — the trap the bag's and the
 * catalogue's own contract barrels exist for. The product page's buy box is a
 * Client Component, and what it draws is here.
 */
export { BackInStockOffer, type BackInStockOfferProps } from './components/BackInStockOffer';
export type { BackInStockTarget, SoldOutSize } from './types';
export {
  backInStockOutcomeSchema,
  backInStockRequestSchema,
  type BackInStockOutcome,
  type BackInStockRequest,
} from './schemas/back-in-stock.schema';
