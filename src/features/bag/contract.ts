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
  bagLinePieceSchema,
  bagLineSchema,
  bagPricingSchema,
  bagSummarySchema,
  freeDeliveryProgressSchema,
  type AppliedCode,
  type BagLine,
  type BagLinePiece,
  type BagPricing,
  type BagSummary,
  type FreeDeliveryProgress,
} from './schemas/bag.schema';
export {
  addToBagRequestSchema,
  addToBagResultSchema,
  applyCodeRequestSchema,
  applyCodeResultSchema,
  moveToWishlistResultSchema,
  sizeSelectionSchema,
  updateQuantityRequestSchema,
  updateQuantityResultSchema,
  type AddToBagRequest,
  type AddToBagResult,
  type ApplyCodeRequest,
  type ApplyCodeResult,
  type MoveToWishlistResult,
  type SizeSelection,
  type UpdateQuantityRequest,
  type UpdateQuantityResult,
} from './schemas/bag-write.schema';

export { EMPTY_BAG } from './lib/empty-bag';
export { addNoticeFor, type AddRefusalWords } from './lib/add-notice';

export { AddToBagButton, type AddToBagButtonProps } from './components/AddToBagButton';
export { BagContents, type BagContentsProps } from './components/BagContents';
export { BagPageScreen, type BagPageScreenProps } from './components/BagPageScreen';
export { BagPageSkeleton } from './components/BagPageSkeleton';
export { BagPanel, preloadBagPanel, type BagPanelProps } from './components/BagPanel';
export { BagProvider, useBag } from './components/BagProvider';
/*
 * STRUCT-04 — the catalogue's card adds to the bag from inside a grid tile, and
 * a cross-feature import is legal only through this barrel. The browser client
 * is exported rather than the server one: `api/bag-server.ts` is `server-only`.
 */
export { addToBag } from './api/bag-browser';
export { BagTrigger, type BagTriggerProps } from './components/BagTrigger';
