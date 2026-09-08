/**
 * STRUCT-04 — the try-on feature's public surface. `app/` imports from here and
 * never reaches into a file inside.
 *
 * One barrel rather than the two the bag has, and the difference is not an
 * oversight. The bag needed a client-safe half because its own Client
 * Components import its schemas from outside the feature; nothing outside this
 * feature does, and the components inside it use relative imports. A second
 * barrel with no consumer would be structure added on speculation (PD-05).
 *
 * The catalogue barrel already exports Server Components, server callers and a
 * Route Handler's dependency together, and this follows it.
 */
export { fetchTryOnOffer } from './api/fetch-try-on-offer';
export { generateTryOn } from './api/generate-try-on';
export { ProductTryOn } from './components/ProductTryOn';
export {
  tryOnOfferSchema,
  tryOnResultSchema,
  type TryOnImage,
  type TryOnOffer,
  type TryOnResult,
  type TryOnUnavailableReason,
} from './schemas/try-on.schema';
