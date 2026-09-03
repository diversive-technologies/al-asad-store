/**
 * STRUCT-04 / STRUCT-06 — the public barrel. Catalogue, search, "you may also
 * like" and wishlist all render product cards; every one of them imports from
 * here rather than reaching into this feature's internals.
 */
export { fetchAvailability } from './api/fetch-availability';
export { ProductBadge, type ProductBadgeProps } from './components/ProductBadge';
export { ProductCard, type ProductCardProps } from './components/ProductCard';
export {
  deriveProductBadges,
  isDiscounted,
  mergeAvailability,
  type ProductBadgeKind,
  type ProductCardWithAvailability,
} from './lib/product-card';
export {
  availabilityListSchema,
  availabilityStatusSchema,
  productAvailabilitySchema,
  type AvailabilityStatus,
  type ProductAvailability,
} from './schemas/availability.schema';
export {
  productCardSchema,
  productTypeSchema,
  type ProductCard as ProductCardData,
  type ProductType,
} from './schemas/product-card.schema';
