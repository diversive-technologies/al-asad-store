/**
 * STRUCT-06 — the CLIENT-SAFE half of this feature's public surface.
 *
 * The split is load-bearing rather than stylistic, and it is the same one the
 * bag makes. `index.ts` re-exports `CatalogueScreen`, which reaches
 * `grid-columns.server.ts` and therefore `next/headers`; a Client Component
 * that imports the main barrel drags that in and the build fails with "you're
 * importing a module that depends on next/headers".
 *
 * So: schemas, types, pure helpers and components that render on either side
 * here; server readers and server-only screens there. Route Handlers are free
 * to import from both, and do.
 */
export { ProductCard, type ProductCardProps } from './components/ProductCard';
export { ProductGrid, type ProductGridProps } from './components/ProductGrid';
export {
  deriveProductBadges,
  isDiscounted,
  mergeAvailability,
  type ProductBadgeKind,
  type ProductCardWithAvailability,
} from './lib/product-card';
export {
  productAvailabilitySchema,
  availabilityListSchema,
  type ProductAvailability,
} from './schemas/availability.schema';
export {
  productCardSchema,
  productPricingSchema,
  productTypeSchema,
  type ProductCard as ProductCardPayload,
  type ProductType,
} from './schemas/product-card.schema';
