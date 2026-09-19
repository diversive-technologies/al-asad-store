/**
 * SEC-02 — an id is put into a path as ONE segment, whatever it contains.
 *
 * `new URL(path, base)` resolves `..` and follows a `/`, so an unencoded value
 * such as `../../account/orders` would retarget the request at a different Java
 * resource. Every id reaching a builder below is parsed first; encoding here is
 * what makes that not the only line of defence.
 */
function segment(value: string): string {
  return encodeURIComponent(value);
}

/**
 * SSOT-04 — THE Java backend endpoint registry. Every backend path is declared
 * once here. Internal navigation URLs are a different registry (SSOT-02) and
 * the two never overlap.
 *
 * Entries are added as modules need them; speculative paths are not declared.
 *
 * ## D6 — no endpoint in this registry uses DELETE, and none ever will
 *
 * The store keeps complete provenance: nothing it has held, priced, shown or
 * sold is destroyed. Anything that stops being current changes STATUS and, once
 * it can no longer affect a live read, moves to cold storage — so "removed from
 * the website" and "gone" are different things, and the second never happens.
 *
 * The verb follows the policy rather than decorating it. `DELETE` on a resource
 * is a promise that the resource is gone afterwards, and that promise would be
 * false here; a POST to a `/removal` sub-resource says what actually occurs,
 * which is that a removal is RECORDED. Five paths carry that today —
 * `bag.lineRemoval`, `bag.codeRemoval`, `account.savedItemRemoval`, the address
 * book's removal and the saved sizes' — and any future one takes the same shape.
 *
 * The exceptions are narrow and are about NOT retaining rather than deleting:
 * customer photographs (§24, §30.4) are never written down in the first place,
 * and credential material is never archived. Neither is a deletion path.
 */
export const ENDPOINTS = {
  content: {
    /** Section 21 ContentQuery.homepage(locale) — locale travels as a query param. */
    homepage: '/api/v1/content/homepage',
    /** Section 21 ContentQuery.page(slug, locale) — 28.4's help and static pages. */
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
     * Several product projections in one read, by id.
     *
     * The saved-items list holds ids and nothing else, so rendering it means
     * asking for those products by id. One request rather than one per id:
     * a list of twenty would otherwise be twenty round trips, and the backend
     * is the only party that can answer them together (PERF-02).
     *
     * A missing id is simply absent from the response rather than a 404 — a
     * product withdrawn since it was saved is an expected outcome for this
     * read, not a failure of it.
     */
    byIds: '/api/v1/catalogue/products/by-ids',
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
    /**
     * §28.2 "You may also like" — the products related to ONE product, by
     * `?productId=`, at most `?limit=` of them, in the order to show them, with
     * `?locale=` for the card's words. An unknown product is a 404.
     *
     * No operation in §15 names this; it is Search and Discovery's by what it
     * does. WHICH products relate, and in what order, is the backend's rule
     * (DATA-13): the storefront sends only the product and how many its grid can
     * hold. The answer is card projections and carries no stock — the §8.2
     * overlay decorates it exactly as it does a listing.
     */
    related: '/api/v1/catalogue/products/related',
    /** §30.5 — every LAUNCHED product's slug and last change, for the sitemap. */
    sitemap: '/api/v1/catalogue/products/sitemap',
  },
  /** Section 25 `FabricCalculator.evaluate(product, height, style)`. */
  fabricCalculator: {
    evaluate: '/api/v1/fabric-calculator/evaluate',
  },
  /**
   * Section 24 Try-On.
   *
   * Two operations, and the split is the point. `offer` is `isAvailable()` and
   * costs nothing — it asks the module whether a provider is configured and
   * never touches the provider itself. `generate` is the one that leaves the
   * building, and it is the only call in this registry budgeted in tens of
   * seconds rather than hundreds of milliseconds.
   *
   * Neither is on the purchase path (ADR 12): the product page renders and Add
   * to Bag works with both of these failing.
   */
  tryOn: {
    offer: '/api/v1/try-on/offer',
    generate: '/api/v1/try-on/generations',
  },
  /**
   * Section 16 `CartService`. The cart is addressed by an id the backend issues
   * and the BFF keeps in an httpOnly cookie — never a path the browser composes.
   */
  bag: {
    /** `summary(cart)`, and the POST that creates a cart on first add. */
    summary: '/api/v1/carts',
    /** `addItem(cart, product_id, {piece_id -> size}, qty)`. */
    items: (cartId: string) => `/api/v1/carts/${segment(cartId)}/items`,
    /** `updateQuantity(cart, line, qty)` — PATCH. */
    line: (cartId: string, lineId: string) =>
      `/api/v1/carts/${segment(cartId)}/items/${segment(lineId)}`,
    /**
     * D6 — `removeItem(cart, line)`, as a POST that RECORDS a removal.
     *
     * This was `DELETE` on the line itself, and the change is the policy rather
     * than a rename: no endpoint in this registry destroys anything. Removing a
     * line appends a removal to the cart's history and releases the hold; the
     * line stays on file with the reason it left.
     */
    lineRemoval: (cartId: string, lineId: string) =>
      `/api/v1/carts/${segment(cartId)}/items/${segment(lineId)}/removal`,
    /**
     * `moveToWishlist(cart, line)` — POST, no body, `?locale=`.
     *
     * ONE operation, not a removal followed by a save from the browser: the line
     * leaves the bag (recorded with the reason `MOVED_TO_WISHLIST`, its hold
     * released at once) and its product joins the saved items of the account
     * named in `API_HEADERS.accountKey`, in the same step. Its own sub-resource
     * rather than `lineRemoval` with a flag, because it is a different operation
     * on §16's list, not a removal with a side effect.
     *
     * Answers 200 with `MOVED` or `NOT_IN_BAG` (both carrying the summary) or
     * `NOT_MOVABLE` for a made-to-measure line; 401 without an account; 404 only
     * for a cart that is not a bag.
     */
    lineWishlistMove: (cartId: string, lineId: string) =>
      `/api/v1/carts/${segment(cartId)}/items/${segment(lineId)}/move-to-wishlist`,
    /** `applyCode(cart, code)` — POST. */
    code: (cartId: string) => `/api/v1/carts/${segment(cartId)}/code`,
    /** D6 — lifting a code is recorded, not erased. See `lineRemoval`. */
    codeRemoval: (cartId: string) => `/api/v1/carts/${segment(cartId)}/code/removal`,
    /** `summary(cart)` for an existing cart. */
    cart: (cartId: string) => `/api/v1/carts/${segment(cartId)}`,
  },
  /** Section 17 `CheckoutService`. */
  checkout: {
    /** `quote(cart, address, deliveryOption) -> {totals, availableMethods}`. */
    quote: (cartId: string) => `/api/v1/carts/${segment(cartId)}/checkout/quote`,
    /** `place(...) -> Order | Failure` — the section 7.2 transaction. */
    place: (cartId: string) => `/api/v1/carts/${segment(cartId)}/checkout/place`,
    /**
     * One order, read by whoever may read it (§28.3): the account that placed
     * it, or a browser presenting an access token the backend issued for it.
     * Anyone else gets the same 404 an unknown number gets.
     */
    order: (orderNumber: string) => `/api/v1/orders/${segment(orderNumber)}`,
    /**
     * §28.3's guest lookup "by number and mobile" — POST, so the mobile travels
     * in a body and never in a URL. A match answers the order and a fresh access
     * token; a wrong mobile is the same 404 as a number that names nothing.
     */
    orderLookup: (orderNumber: string) => `/api/v1/orders/${segment(orderNumber)}/lookups`,
  },
  /**
   * §34 module 18 — Made-to-Measure. The measurement list is CONTENT (ADR 17):
   * served per garment style, in the order the form asks, carrying ids and shapes
   * and no words (§34.3).
   */
  madeToMeasure: {
    /** The styles the workshop stitches, each with its lead time (A2-4). */
    styles: '/api/v1/made-to-measure/styles',
    /** One style's measurement set, by `?style=` (A2-3). A style not offered is a 404. */
    set: '/api/v1/made-to-measure/measurement-sets',
    /**
     * §34.4 `validate` (A2-5) — what WOULD be recorded, and what stands in the way.
     * Stores nothing, so the studio's review can ask before anything is saved.
     */
    validation: '/api/v1/made-to-measure/validations',
    /** §34.4 `saveProfile` (A2-5, A2-8) — a NEW version when anything changed; never an update. */
    profiles: '/api/v1/made-to-measure/profiles',
    /**
     * A guest's device token — the owner of their profiles until they sign in —
     * minted by the module, as a cart id is minted by the cart's (§16).
     */
    deviceTokens: '/api/v1/made-to-measure/device-tokens',
  },
  /** §22 Localisation. */
  localisation: {
    /** The studio's wording by id, for every style at once, per `?locale=`. */
    measurementCopy: '/api/v1/localisation/measurement-copy',
  },
  newsletter: {
    subscribe: '/api/v1/newsletter/subscriptions',
  },
  /**
   * §28.2's "Sold-out sizes with Notify Me" — the request that §28.7's
   * back-in-stock email answers later.
   *
   * POST `{ productId, pieceId | null, sizeId, email | null }` with `?locale=`,
   * the language the email is to be written in. The account, when there is one,
   * travels in `API_HEADERS.accountKey` and never in the body. Every answer to a
   * well-formed request for a size the store sells is a 200 carrying a `kind`;
   * an unknown product, piece or size is a 404.
   *
   * No row of §5.1 owns this list: Inventory is a leaf that knows no customers,
   * and Notifications owns templates and a send log with no business logic. It
   * sits under its own path until the backend settles which module keeps it.
   */
  backInStock: {
    requests: '/api/v1/back-in-stock/requests',
  },
  /**
   * §28.3's account: the saved items, the address book, the order history and
   * the saved sizes.
   */
  account: {
    /** What this customer has saved. GET reads it, POST adds to it. */
    savedItems: '/api/v1/account/saved-items',
    /** D6 — a removal is RECORDED at its own path; there is no DELETE. */
    savedItemRemoval: '/api/v1/account/saved-items/removal',
    /**
     * §28.3's saved addresses. GET reads the book; POST saves one, or revises
     * one when the body names an id — a revision being the next VERSION of that
     * address rather than an overwrite (D6).
     */
    addresses: '/api/v1/account/addresses',
    /** D6 — a removal is RECORDED; the address and its date stay on file. */
    addressRemoval: '/api/v1/account/addresses/removal',
    /** Which address checkout should offer first. Its own path, because choosing
        a default is an event about the BOOK rather than an edit to one address. */
    addressDefault: '/api/v1/account/addresses/default',
    /**
     * §28.3's saved sizes — at most ONE current size per size set (§6.1), for the
     * account named in `API_HEADERS.accountKey`. `?locale=` on every call, since
     * the answer carries the set's name and the size's label.
     *
     * GET answers `{ sizes: [{ sizeSet: {id, name}, size: {id, label}, savedAt }] }`,
     * each set at most once. POST `{ sizeId }` saves that size and supersedes
     * whatever its set held — the set is the backend's to resolve from the id,
     * because a size id names one size of one set — and answers the same list; an
     * id that is not a size of any set is a 404. Append-only (D6): a save is a new
     * record, never an update. No account is a 401.
     */
    savedSizes: '/api/v1/account/saved-sizes',
    /**
     * D6 — POST `{ sizeId }` RECORDS that the customer asked for that saved size to
     * be forgotten, and answers the list. It names the SIZE rather than the set, so
     * a page opened before the set changed cannot forget a size it never showed: a
     * size that is not the current one for its set is a 404.
     */
    savedSizeRemoval: '/api/v1/account/saved-sizes/removal',
    /**
     * §28.3's order history — a LIST, not tracking. A reduced projection: enough
     * to recognise an order and follow it to `/order/{number}`, which is the
     * page that already holds the whole thing.
     *
     * PAGED, newest first: `?limit=` (1–100) and `?cursor=`, the `nextCursor` the
     * page before answered with, absent for the newest orders. The answer is
     * `{ orders, nextCursor }`, and a `null` cursor means the oldest order is in it.
     */
    orders: '/api/v1/account/orders',
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
