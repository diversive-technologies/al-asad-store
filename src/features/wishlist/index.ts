/**
 * STRUCT-04 — the feature's SERVER-facing surface.
 *
 * These reach the backend through `apiRequest`, which is `server-only`, so a
 * Client Component must not import this file. The hook a CARD needs is in
 * `contract.ts` (STRUCT-06); `WishlistScreen` stays here because the only thing
 * that mounts it is a Server Component, and a client barrel carrying the whole
 * product grid would make a cycle out of the card that imports the hook.
 */
export { AccountSavedItems } from './components/AccountSavedItems';
export { WishlistScreen, type WishlistScreenProps } from './components/WishlistScreen';
export { fetchSavedItems, removeItems, saveItems } from './api/saved-items-server';
export {
  savedItemsChangeSchema,
  savedItemsSchema,
  type SavedItems,
} from './schemas/saved-items.schema';
