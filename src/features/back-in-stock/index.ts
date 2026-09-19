/**
 * STRUCT-04 — the feature's SERVER-facing surface: §28.2's Notify Me, as the BFF
 * sends it on. A Client Component imports `contract.ts` instead, because
 * `requestBackInStock` is `server-only` (STRUCT-06).
 */
export {
  backInStockFailureStatus,
  requestBackInStock,
  type BackInStockAsker,
} from './api/back-in-stock-server';
export {
  backInStockOutcomeSchema,
  backInStockRequestSchema,
  type BackInStockOutcome,
  type BackInStockRequest,
} from './schemas/back-in-stock.schema';
