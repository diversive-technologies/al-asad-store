/**
 * The query parameter carrying where a sign-in or sign-up returns the customer to.
 * Written only by `ROUTES.signInFrom` / `signUpFrom`, and read back only through
 * `returnPathFrom`, which allow-lists it (SEC-06).
 */
export const RETURN_TO_PARAM = 'returnTo';

/* Named once, because each is both a route and the base of its `…From` builder. */
const SIGN_IN = '/sign-in';
const SIGN_UP = '/sign-up';

/**
 * §28.4's four help pages, by the slug §21's Content module serves each under.
 *
 * The slug is both the content's identity and the page's address, and something
 * other than a link now needs it: the product page READS the size guide to show
 * it in a dialog beside the size selector. Named once here, so the address and
 * the read cannot come to name two different pages (PD-01).
 */
export const HELP_PAGE_SLUGS = {
  fabricGlossary: 'fabric-glossary',
  paymentGuide: 'payment-guide',
  sizeGuide: 'size-guide',
  careGuide: 'care-guide',
} as const;

/**
 * §28.4's "static pages" — the store's information and policy pages — by the slug
 * §21 serves each under. The same `page(slug, locale)` read as the help pages, so
 * the same route and the same address shape: one slug namespace behind one route
 * is what keeps every page at exactly ONE address (§30.5). Named here, beside the
 * help slugs, so the footer, the sitemap and the contact details read one list.
 */
export const STORE_PAGE_SLUGS = {
  about: 'about-us',
  contact: 'contact-us',
  delivery: 'delivery',
  returns: 'returns-and-exchanges',
  terms: 'terms-of-sale',
  privacy: 'privacy-policy',
} as const;

/* Every order's address starts here; robots.txt keeps crawlers out of all of them. */
const ORDER_PREFIX = '/order/';

function helpPage(slug: string): string {
  return `/help/${encodeURIComponent(slug)}`;
}

function withReturnTo(path: string, returnTo: string | null): string {
  if (returnTo === null) return path;
  return `${path}?${new URLSearchParams({ [RETURN_TO_PARAM]: returnTo }).toString()}`;
}

/**
 * SSOT-02 — THE route registry. Internal navigation URLs live here and nowhere
 * else. Backend request paths are a different registry (SSOT-04).
 */
export const ROUTES = {
  home: '/',
  signIn: SIGN_IN,
  signUp: SIGN_UP,
  /**
   * The auth screens remembering the page that sent the customer, so signing in
   * lands them back there rather than on the homepage. `null` is the plain screen.
   * Whatever arrives in the address is untrusted: the screen reads it back only
   * through `returnPathFrom`, never as written.
   */
  signInFrom: (returnTo: string | null) => withReturnTo(SIGN_IN, returnTo),
  signUpFrom: (returnTo: string | null) => withReturnTo(SIGN_UP, returnTo),
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
     * A filtered listing view, for the footer's links. Section 28.1 keeps filter
     * state URL-encoded so a filtered view is shareable and back-button-correct;
     * the canonical encoding of every filter is `features/catalogue`'s
     * `search-params.ts`, and a helper is added here only when something links.
     */
    byGarmentType: (garmentType: string) => `/catalogue?garmentType=${garmentType}`,
  },
  /**
   * What every path in `api` below starts with. Not a route of its own — it is
   * what robots.txt keeps crawlers out of, and `robots.test.ts` holds each path
   * below to it.
   */
  apiPrefix: '/api/',
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
    /**
     * §28.2's Notify Me — POST asks to be emailed when a sold-out size is back.
     * A BFF because the press happens in the browser and the account is read
     * from the session on the server side.
     */
    backInStock: '/api/back-in-stock',
    /** §28.3's address book. GET reads it; POST saves or revises one. */
    addresses: '/api/addresses',
    /** D6 — POST records that an address was removed; nothing is destroyed. */
    addressRemoval: '/api/addresses/removal',
    /** POST chooses which address checkout offers first. */
    addressDefault: '/api/addresses/default',
    /** §28.3's saved sizes. GET reads them; POST remembers one, superseding its size set's. */
    savedSizes: '/api/saved-sizes',
    /** D6 — POST records that a saved size was forgotten; nothing is destroyed. */
    savedSizeRemoval: '/api/saved-sizes/removal',
    /** §34.4 `validate`, for the studio's review before a save. Stores nothing. */
    measurementCheck: '/api/made-to-measure/check',
    /** §34.4 `saveProfile` — a new version when anything changed, never an overwrite (D6). */
    measurementProfiles: '/api/made-to-measure/profiles',
    /** §16 — GET the summary, POST to add a line. */
    bag: '/api/bag',
    /** PATCH the quantity. D6: removal is its own path, never a DELETE. */
    bagLine: (lineId: string) => `/api/bag/lines/${encodeURIComponent(lineId)}`,
    /** D6 — POST records that the line was removed; nothing is destroyed. */
    bagLineRemoval: (lineId: string) => `/api/bag/lines/${encodeURIComponent(lineId)}/removal`,
    /**
     * §16 `moveToWishlist` — POST: the line leaves the bag and its product joins
     * the signed-in customer's saved items, in one step. A guest is refused.
     */
    bagLineWishlistMove: (lineId: string) =>
      `/api/bag/lines/${encodeURIComponent(lineId)}/move-to-wishlist`,
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
    checkoutOrder: (orderNumber: string) =>
      `/api/checkout/order/${encodeURIComponent(orderNumber)}`,
    /**
     * §28.3's lookup "by number and mobile" — POST, so the mobile travels in a
     * body and never in an address a browser keeps in its history.
     */
    checkoutOrderLookup: (orderNumber: string) =>
      `/api/checkout/order/${encodeURIComponent(orderNumber)}/lookup`,
  },
  bag: '/bag',
  /** §28.3's saved items. Offered only to a signed-in customer — see the page. */
  wishlist: '/wishlist',
  /** §28.3's account area. A guest has one too — measurements save before anyone signs in. */
  account: '/account',
  /**
   * The account with its order history paged past the first page (§28.3): how
   * many orders are shown, and the cursor the shown window starts after. Named
   * and required, as `stitchedWith` is, and built with `URLSearchParams` because
   * a cursor is the backend's opaque string. `fragment` names the element the
   * page should land on, since a new page of rows is lower down than the top.
   */
  accountWith: (
    query: { readonly orders: number | null; readonly ordersAfter: string | null },
    fragment: string,
  ) => {
    const params = new URLSearchParams();
    if (query.orders !== null) params.set('orders', String(query.orders));
    if (query.ordersAfter !== null) params.set('ordersAfter', query.ordersAfter);
    const search = params.toString();
    return `/account${search === '' ? '' : `?${search}`}#${encodeURIComponent(fragment)}`;
  },
  /** §28.3's address book, managed on its own page so `/account` stays a read. */
  accountAddresses: '/account/addresses',
  checkout: '/checkout',
  /** §28.3 — the order number is the address, so it can be shared and returned to. */
  orderConfirmation: (orderNumber: string) => `${ORDER_PREFIX}${encodeURIComponent(orderNumber)}`,
  /** The start every order's address shares; nothing is served at it alone. */
  orderPrefix: ORDER_PREFIX,
  search: '/search',
  /** §30.5's automatic sitemap (`app/sitemap.ts`), named in robots.txt. */
  sitemap: '/sitemap.xml',
  help: {
    /** Any help page by its content slug — its canonical address (§30.5). */
    page: helpPage,
    fabricGlossary: helpPage(HELP_PAGE_SLUGS.fabricGlossary),
    paymentGuide: helpPage(HELP_PAGE_SLUGS.paymentGuide),
    sizeGuide: helpPage(HELP_PAGE_SLUGS.sizeGuide),
    careGuide: helpPage(HELP_PAGE_SLUGS.careGuide),
  },
} as const;
