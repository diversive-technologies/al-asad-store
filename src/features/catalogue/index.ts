/**
 * STRUCT-04 / STRUCT-06 — the public barrel. Catalogue, search, "you may also
 * like" and wishlist all render product cards; every one of them imports from
 * here rather than reaching into this feature's internals.
 */
export { fetchAvailability } from './api/fetch-availability';
export { findByCode } from './api/find-by-code';
export { searchProducts } from './api/search-products';
export { suggest } from './api/suggest';
export { CatalogueScreen, type CatalogueScreenProps } from './components/CatalogueScreen';
export { Pagination, type PaginationProps } from './components/Pagination';
export { ProductBadge, type ProductBadgeProps } from './components/ProductBadge';
export { ProductGrid, type ProductGridProps } from './components/ProductGrid';
export { SearchField, type SearchFieldProps } from './components/SearchField';
export { ProductCard, type ProductCardProps } from './components/ProductCard';
export {
  deriveProductBadges,
  isDiscounted,
  mergeAvailability,
  type ProductBadgeKind,
  type ProductCardWithAvailability,
} from './lib/product-card';
export {
  clearFilters,
  EMPTY_QUERY,
  hasActiveFilters,
  listActiveFilters,
  PARAM_KEYS,
  parseCatalogueQuery,
  removeActiveFilter,
  setInStockOnly,
  setPage,
  setPriceRange,
  setSort,
  toggleFacetValue,
  toQueryString,
  toSearchParams,
  type ActiveFilter,
} from './lib/search-params';
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
export {
  catalogueQuerySchema,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  FACET_KEYS,
  resultPageSchema,
  searchFacetsSchema,
  SORT_OPTIONS,
  suggestionsSchema,
  type CatalogueQuery,
  type FacetEntry,
  type FacetKey,
  type ResultPage,
  type SearchFacets,
  type SortOption,
  type Suggestions,
} from './schemas/search.schema';
