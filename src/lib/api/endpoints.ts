/**
 * SSOT-04 — THE Java backend endpoint registry. Every backend path is declared
 * once here. Internal navigation URLs are a different registry (SSOT-02) and
 * the two never overlap.
 *
 * Entries are added as modules need them; speculative paths are not declared.
 */
export const ENDPOINTS = {
  content: {
    /** Section 21 ContentQuery.homepage(locale) — locale travels as a query param. */
    homepage: '/api/v1/content/homepage',
    /** Section 21 ContentQuery.page(slug, locale) — the four help pages of 28.4. */
    page: '/api/v1/content/pages',
  },
  catalogue: {
    /**
     * Availability is a separate read from the product projection on purpose:
     * architecture 8.2 keeps stock out of the cached projection so browse
     * traffic does not invalidate the cache on every order.
     */
    availability: '/api/v1/catalogue/availability',
    /**
     * Section 15 `search(term, filters, sort, paging)`. ONE endpoint serves both
     * the catalogue listing and the search results page — the listing is this
     * query with an empty term.
     */
    search: '/api/v1/catalogue/search',
    /** Section 15 `suggest(partial)` — budgeted under 100ms by section 30.1. */
    suggest: '/api/v1/catalogue/suggest',
    /** Section 15 `byCode(code)` — the product-code lookup of section 28.1. */
    byCode: '/api/v1/catalogue/products/by-code',
    /**
     * Section 12 `CatalogueQuery.getProduct`. That signature reads
     * `getProduct(id | code)`; the storefront addresses products by SLUG because
     * section 30.5 wants one canonical, readable URL per product, so the slug is
     * the third key the backend must accept.
     */
    product: '/api/v1/catalogue/products/by-slug',
    /**
     * The per-size availability overlay for ONE product. Separate from the list
     * overlay above for the same reason it exists at all (architecture 8.2):
     * product data caches for hours, stock does not cache at all.
     */
    productAvailability: '/api/v1/catalogue/availability/product',
  },
  newsletter: {
    subscribe: '/api/v1/newsletter/subscriptions',
  },
  auth: {
    session: '/api/v1/auth/session',
  },
} as const;
