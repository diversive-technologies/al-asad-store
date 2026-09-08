/**
 * SSOT-02 — THE route registry. Internal navigation URLs live here and nowhere
 * else. Backend request paths are a different registry (SSOT-04).
 */
export const ROUTES = {
  home: '/',
  signIn: '/sign-in',
  signUp: '/sign-up',
  forgotPassword: '/forgot-password',
  catalogue: {
    list: '/catalogue',
    detail: (slug: string) => `/catalogue/${slug}`,
    /**
     * Filtered listing views. Section 28.1 keeps filter state URL-encoded so a
     * filtered view is shareable and back-button-correct; these helpers are the
     * only place that encoding is expressed.
     */
    byGarmentType: (garmentType: string) => `/catalogue?garmentType=${garmentType}`,
    byPieceCount: (pieceCount: number) => `/catalogue?pieceCount=${String(pieceCount)}`,
    byCollection: (collection: string) => `/catalogue?collection=${collection}`,
  },
  /**
   * Internal BFF paths (DATA-08). Nothing navigates here — these are fetched,
   * not linked — but they are still internal URLs, and the string has to exist
   * in exactly one place. Java backend paths are a different registry (SSOT-04)
   * and the two never overlap.
   */
  api: {
    suggest: '/api/suggest',
    fabricCalculator: '/api/fabric-calculator',
    /** Section 24. Multipart in, one JSON image out — see app/api/try-on. */
    tryOn: '/api/try-on',
    /** §28.2's quick add: the sizes a card may offer, read on demand. */
    quickAdd: '/api/quick-add',
    /**
     * The saved items, by id. A BFF because the ids live in the BROWSER, so the
     * request can only start there — and `apiRequest` is `server-only`.
     */
    products: '/api/products',
    /** §16 — GET the summary, POST to add a line. */
    bag: '/api/bag',
    /** PATCH the quantity. D6: removal is its own path, never a DELETE. */
    bagLine: (lineId: string) => `/api/bag/lines/${lineId}`,
    /** D6 — POST records that the line was removed; nothing is destroyed. */
    bagLineRemoval: (lineId: string) => `/api/bag/lines/${lineId}/removal`,
    /** POST to apply a promotional code. */
    bagCode: '/api/bag/code',
    /** D6 — POST records that the code was lifted. */
    bagCodeRemoval: '/api/bag/code/removal',
    /** §17 — the quote refreshes as the customer picks delivery and gifting. */
    checkoutQuote: '/api/checkout/quote',
    /** §7.2 — the one write that turns a bag into an order. */
    checkoutPlace: '/api/checkout/place',
  },
  bag: '/bag',
  /** §28.3's saved items. Offered only to a signed-in customer — see the page. */
  wishlist: '/wishlist',
  checkout: '/checkout',
  /** §28.3 — the order number is the address, so it can be shared and returned to. */
  orderConfirmation: (orderNumber: string) => `/order/${orderNumber}`,
  search: '/search',
  help: {
    fabricGlossary: '/help/fabric-glossary',
    paymentGuide: '/help/payment-guide',
    sizeGuide: '/help/size-guide',
    careGuide: '/help/care-guide',
  },
} as const;
