/**
 * STRUCT-06 — the wishlist's CLIENT-SAFE barrel.
 *
 * `index.ts` now reaches the backend through `apiRequest`, which is `server-only`,
 * so a Client Component importing it fails the build outright — the trap the
 * catalogue's own contract barrel exists for. What a card needs is here instead.
 */
export { SavedItemsProvider, useCarriedFromThisBrowser } from './components/SavedItemsProvider';
export { useWishlist, type Wishlist } from './hooks/use-wishlist';
