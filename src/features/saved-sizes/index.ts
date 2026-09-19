/**
 * STRUCT-04 — the saved sizes' SERVER-facing surface (§28.3).
 *
 * These reach the backend through `apiRequest`, which is `server-only`, so a
 * Client Component must not import this file. The client-safe surface is
 * `contract.ts` (STRUCT-06).
 */
export { AccountSavedSizes } from './components/AccountSavedSizes';
export { fetchSavedSizes, forgetSize, rememberSize } from './api/saved-sizes-server';
export {
  MAX_SAVED_SIZES,
  savedSizeChoiceSchema,
  savedSizesSchema,
  type SavedSize,
  type SavedSizeChoice,
  type SavedSizes,
} from './schemas/saved-size.schema';
