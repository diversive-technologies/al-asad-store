/**
 * STRUCT-06 — the saved sizes' CLIENT-SAFE barrel.
 *
 * `index.ts` reaches the backend through `apiRequest`, which is `server-only`,
 * so a Client Component importing it fails the build outright. The product
 * page's buy box and a card's size tray are Client Components, and what they use
 * is here.
 */
export {
  RememberSizeOffer,
  type OfferedSize,
  type RememberSizeOfferProps,
} from './components/RememberSizeOffer';
export { useSavedSizes, type SavedSizesState } from './hooks/use-saved-sizes';
export type { SavedSize, SavedSizes } from './schemas/saved-size.schema';
