/**
 * STRUCT-04 / STRUCT-06 — the public barrel. Catalogue, search, "you may also
 * like" and wishlist all render product cards; every one of them imports from
 * here rather than reaching into this feature's internals.
 */
export { fetchAvailability } from './api/fetch-availability';
export { fetchProduct } from './api/fetch-product';
export { fetchProductAvailability } from './api/fetch-product-availability';
export { findByCode } from './api/find-by-code';
export { searchProducts } from './api/search-products';
export { suggest } from './api/suggest';
export { fetchSuggestions, type SuggestionsError } from './api/fetch-suggestions';
export { CatalogueScreen, type CatalogueScreenProps } from './components/CatalogueScreen';
export { CodeMatch, type CodeMatchProps } from './components/CodeMatch';
export { ProductBuyBox, type ProductBuyBoxProps } from './components/ProductBuyBox';
export { ProductGallery, type ProductGalleryProps } from './components/ProductGallery';
export { ProductScreen, type ProductScreenProps } from './components/ProductScreen';
export { SizeSelector, type SizeSelectorProps } from './components/SizeSelector';
export { ListingSkeleton } from './components/ListingSkeleton';
export { FacetGroup, type FacetGroupProps } from './components/FacetGroup';
export { HeaderSearch, type HeaderSearchProps } from './components/HeaderSearch';
export { SearchSuggestions, type SearchSuggestionsProps } from './components/SearchSuggestions';
export { FilterChips, type FilterChipsProps } from './components/FilterChips';
export { FilterDisclosure, type FilterDisclosureProps } from './components/FilterDisclosure';
export { FilterPanel, type FilterPanelProps } from './components/FilterPanel';
export { FilterToggleLink, type FilterToggleLinkProps } from './components/FilterToggleLink';
export { Pagination, type PaginationProps } from './components/Pagination';
export { ProductBadge, type ProductBadgeProps } from './components/ProductBadge';
export { ProductGrid, type ProductGridProps } from './components/ProductGrid';
export { PriceFilter, type PriceFilterProps } from './components/PriceFilter';
export { SortControl, type SortControlProps } from './components/SortControl';
export { SearchField, type SearchFieldProps } from './components/SearchField';
export { ProductCard, type ProductCardProps } from './components/ProductCard';
export {
  deriveProductBadges,
  isDiscounted,
  mergeAvailability,
  type ProductBadgeKind,
  type ProductCardWithAvailability,
} from './lib/product-card';
export { shouldAttemptCodeLookup } from './lib/product-code';
export {
  applyUnifiedSize,
  initialSelection,
  isSelectionComplete,
  setPieceSize,
  sizeStatus,
  unifiedSizeOf,
  type SizeSelection,
} from './lib/size-selection';
export {
  NO_ACTIVE_OPTION,
  nextActiveIndex,
  toSuggestionOptions,
  type SuggestionOption,
} from './lib/suggestions';
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
  pieceAvailabilitySchema,
  productDetailAvailabilitySchema,
  type PieceAvailability,
  type ProductDetailAvailability,
  type SizeAvailability,
} from './schemas/piece-availability.schema';
export {
  productDetailSchema,
  type Colour,
  type Fabric,
  type InfoSection,
  type ModelInfo,
  type Piece,
  type ProductDetail,
  type ProductMedia,
  type SizeOption,
} from './schemas/product-detail.schema';
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
