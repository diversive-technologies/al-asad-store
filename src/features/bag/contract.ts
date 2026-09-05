/**
 * STRUCT-06 — the CLIENT-SAFE half of this feature's public surface.
 *
 * The bag is split into two barrels, and the split is load-bearing rather than
 * stylistic. `index.ts` re-exports modules that import `server-only` — the API
 * callers and the cart cookie — so anything a Client Component touches has to
 * come from somewhere else, or the `server-only` guard fires at build time and
 * takes the whole bundle with it.
 *
 * So: schemas, types and pure helpers here; server callers and components
 * there. Route Handlers are free to import from both, and do.
 */
export {
  addToBagRequestSchema,
  addToBagResultSchema,
  applyCodeRequestSchema,
  applyCodeResultSchema,
  bagLinePieceSchema,
  bagLineSchema,
  bagPricingSchema,
  bagSummarySchema,
  freeDeliveryProgressSchema,
  sizeSelectionSchema,
  updateQuantityRequestSchema,
  updateQuantityResultSchema,
  type AddToBagRequest,
  type AddToBagResult,
  type AppliedCode,
  type ApplyCodeRequest,
  type ApplyCodeResult,
  type BagLine,
  type BagLinePiece,
  type BagPricing,
  type BagSummary,
  type FreeDeliveryProgress,
  type SizeSelection,
  type UpdateQuantityRequest,
  type UpdateQuantityResult,
} from './schemas/bag.schema';

export { EMPTY_BAG } from './lib/empty-bag';

export { AddToBagButton, type AddToBagButtonProps } from './components/AddToBagButton';
export { BagPanel, type BagPanelProps } from './components/BagPanel';
export { BagProvider, useBag } from './components/BagProvider';
export { BagTrigger, type BagTriggerProps } from './components/BagTrigger';
