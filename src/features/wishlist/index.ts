/**
 * STRUCT-04 — the feature's public surface. Everything another feature or a
 * route may use is named here; nothing reaches past it into a file path.
 */
export { WishlistScreen, type WishlistScreenProps } from './components/WishlistScreen';
export { fetchSavedProducts, type SavedProductsError } from './api/fetch-saved-products';
