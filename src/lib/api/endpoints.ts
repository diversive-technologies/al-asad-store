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
  /** Section 25 `FabricCalculator.evaluate(product, height, style)`. */
  fabricCalculator: {
    evaluate: '/api/v1/fabric-calculator/evaluate',
  },
  /**
   * Section 16 `CartService`. The cart is addressed by an id the backend issues
   * and the BFF keeps in an httpOnly cookie — never a path the browser composes.
   */
  bag: {
    /** `summary(cart)`, and the POST that creates a cart on first add. */
    summary: '/api/v1/carts',
    /** `addItem(cart, product_id, {piece_id -> size}, qty)`. */
    items: (cartId: string) => `/api/v1/carts/${cartId}/items`,
    /** `updateQuantity(cart, line, qty)` and `removeItem(cart, line)`. */
    line: (cartId: string, lineId: string) => `/api/v1/carts/${cartId}/items/${lineId}`,
    /** `applyCode(cart, code)`, and DELETE to lift it again. */
    code: (cartId: string) => `/api/v1/carts/${cartId}/code`,
    /** `summary(cart)` for an existing cart. */
    cart: (cartId: string) => `/api/v1/carts/${cartId}`,
  },
  /** Section 17 `CheckoutService`. */
  checkout: {
    /** `quote(cart, address, deliveryOption) -> {totals, availableMethods}`. */
    quote: (cartId: string) => `/api/v1/carts/${cartId}/checkout/quote`,
    /** `place(...) -> Order | Failure` — the section 7.2 transaction. */
    place: (cartId: string) => `/api/v1/carts/${cartId}/checkout/place`,
    /** Section 28.3 tracks a guest order by number. */
    order: (orderNumber: string) => `/api/v1/orders/${orderNumber}`,
  },
  newsletter: {
    subscribe: '/api/v1/newsletter/subscriptions',
  },
  /** Section 11 Identity and Access. */
  auth: {
    /** `authenticate(email, password) -> Session`. */
    authenticate: '/api/v1/auth/sessions',
    /** `issueCode(mobile) -> void`. */
    issueCode: '/api/v1/auth/codes',
    /** `authenticateByCode(mobile, code) -> Session`. */
    authenticateByCode: '/api/v1/auth/sessions/by-code',
    /** Registration. Section 11 owns accounts. */
    register: '/api/v1/auth/accounts',
    /** `resetPassword(email) -> void`. */
    resetPassword: '/api/v1/auth/password-resets',
  },
} as const;
