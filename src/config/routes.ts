/**
 * SSOT-02 — THE route registry. Internal navigation URLs live here and nowhere
 * else. Backend request paths are a different registry (SSOT-04).
 */
export const ROUTES = {
  home: '/',
  signIn: '/sign-in',
  signUp: '/sign-up',
  forgotPassword: '/forgot-password',
  /** §34 — the measurement studio, usable without buying anything. */
  stitched: '/stitched',
  /**
   * §34 — the studio at any address it reads: a style, a way of measuring, a
   * product it was opened from, any of them or none.
   *
   * Named rather than positional, so a style can never be passed as a source, and
   * EVERY field is stated rather than optional — a caller that simply forgot the
   * product would drop the customer's garment on the floor silently, which is
   * exactly what a required `null` makes impossible. Built with `URLSearchParams`,
   * so nothing relies on a caller's value needing no escaping; a slug is the one
   * of the three that is not a plain code.
   */
  stitchedWith: (query: {
    readonly style: string | null;
    readonly source: string | null;
    readonly product: string | null;
  }) => {
    const params = new URLSearchParams();
    if (query.style !== null) params.set('style', query.style);
    if (query.source !== null) params.set('source', query.source);
    if (query.product !== null) params.set('product', query.product);
    const search = params.toString();
    return search === '' ? '/stitched' : `/stitched?${search}`;
  },
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
    /** §28.3's saved items, for the account that owns them. GET reads, POST adds. */
    savedItems: '/api/saved-items',
    /** D6 — POST records that an item was removed; nothing is destroyed. */
    savedItemRemoval: '/api/saved-items/removal',
    /** §28.3's address book. GET reads it; POST saves or revises one. */
    addresses: '/api/addresses',
    /** D6 — POST records that an address was removed; nothing is destroyed. */
    addressRemoval: '/api/addresses/removal',
    /** POST chooses which address checkout offers first. */
    addressDefault: '/api/addresses/default',
    /** §34.4 `validate`, for the studio's review before a save. Stores nothing. */
    measurementCheck: '/api/made-to-measure/check',
    /** §34.4 `saveProfile` — a new version when anything changed, never an overwrite (D6). */
    measurementProfiles: '/api/made-to-measure/profiles',
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
    /**
     * §28.3 — reading one order back.
     *
     * The confirmation page reads through here rather than during its own
     * server render, because under D1 the order lives in mock state that only
     * the Route Handler process has written to.
     */
    checkoutOrder: (orderNumber: string) => `/api/checkout/order/${orderNumber}`,
  },
  bag: '/bag',
  /** §28.3's saved items. Offered only to a signed-in customer — see the page. */
  wishlist: '/wishlist',
  /** §28.3's account area. A guest has one too — measurements save before anyone signs in. */
  account: '/account',
  /** §28.3's address book, managed on its own page so `/account` stays a read. */
  accountAddresses: '/account/addresses',
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
