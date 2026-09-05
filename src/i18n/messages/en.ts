/**
 * SSOT-07 — THE copy registry. `en` is the shape-defining dictionary; every
 * other locale is typed against `Messages`, so a missing Urdu key is a compile
 * error rather than a blank string in production (I18N-10).
 *
 * I18N-06: each entry is a whole sentence or a whole label. Fragments that
 * callers would concatenate are PROHIBITED — word order differs between the two
 * languages.
 */
export const en = {
  site: {
    name: 'Al-Asad',
    tagline: 'Ethnic apparel, stitched and unstitched.',
  },
  nav: {
    home: 'Home',
    catalogue: 'Catalogue',
    unstitched: 'Unstitched',
    stitched: 'Stitched',
    search: 'Search',
    closeSearch: 'Close search',
    bag: 'Bag',
    signIn: 'Sign in',
    skipToContent: 'Skip to content',
    footerLabel: 'Footer navigation',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
  common: {
    switchToUrdu: 'اردو',
    switchToEnglish: 'English',
    languageGroupLabel: 'Language',
    loading: 'Loading…',
    close: 'Close',
    retry: 'Try again',
    viewAll: 'View all',
    submit: 'Submit',
  },
  product: {
    newBadge: 'New',
    discountBadge: 'Sale',
    lowStockBadge: 'Low stock',
    soldOutBadge: 'Sold out',
    setLabel: 'Set',
    singleLabel: 'Single piece',
    pieceCountLabel: 'Pieces',
    originalPriceLabel: 'Was',
    metreageLabel: 'Fabric length',
    colourLabel: 'Colour',
    imageAlt: 'Product photograph',
    galleryLabel: 'Product images',
    viewImage: 'View image {index}',
    selectSizeHeading: 'Size',
    unifiedSizeHeading: 'Size for the whole set',
    perPieceHeading: 'Adjust individual pieces',
    sizeSoldOut: 'Sold out',
    sizeLowStock: 'Low stock',
    sizeUnknown: 'Availability unknown',
    chooseSizeFirst: 'Choose a size to continue',
    addToBag: 'Add to bag',
    bagPending: 'Adding to the bag arrives with the bag panel',
    productSoldOut: 'This product is sold out',
    includedHeading: 'What is included',
    fabricLabel: 'Fabric',
    careLabel: 'Care',
    lengthLabel: 'Length',
    codeLabel: 'Product code',
    estimatedDelivery: 'Estimated delivery',
    modelNote: 'Model is {height} cm and wears size {size}',
    backToCatalogue: 'Back to the catalogue',
    notFoundHeading: 'We could not find that product',
    notFoundBody: 'It may have sold out or the link may be out of date.',
    fabricCalcHeading: 'Will this be enough fabric?',
    fabricCalcBody: 'Tell us your height and what you plan to have stitched.',
    fabricCalcHeight: 'Your height in centimetres',
    fabricCalcStyle: 'What you are having stitched',
    fabricCalcSubmit: 'Check',
    fabricCalcComfortable: 'Comfortable — about {spare} to spare.',
    fabricCalcJustEnough: 'Just enough. It fits, with very little margin for error.',
    fabricCalcInsufficient: 'Not enough — about {shortfall} short.',
    fabricCalcUnavailable: 'We could not check that just now. Please try again.',
    fabricCalcNote: 'A guide, not a guarantee. Your tailor decides the final cut.',
  },
  home: {
    metaTitle: 'Ethnic apparel, stitched and unstitched',
    metaDescription:
      'Wash-n-wear, boski and karandi in stitched and unstitched form. Delivered across Pakistan, cash on delivery available.',
    railScrollLabel: 'Scroll products',
  },
  newsletter: {
    heading: 'New arrivals, before anyone else',
    body: 'One message when a collection launches. Nothing else.',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    subscribeCta: 'Subscribe',
    successMessage: 'You are on the list. Look out for the next launch.',
    invalidEmail: 'Enter a valid email address.',
  },
  auth: {
    signInHeading: 'Sign in',
    signInBody: 'A placeholder sign-in while the real authentication is designed.',
    mobileLabel: 'Mobile number',
    signInCta: 'Continue',
    invalidMobile: 'Enter a valid Pakistani mobile number.',
    signedInAs: 'Signed in',
    signOut: 'Sign out',
    placeholderNotice:
      'This screen is a placeholder. It creates a mock session and stores no credentials.',
  },
  footer: {
    helpHeading: 'Help',
    shopHeading: 'Shop',
    fabricGlossary: 'Fabric glossary',
    paymentGuide: 'Payment guide',
    sizeGuide: 'Size guide',
    careGuide: 'Care guide',
    rightsReserved: 'All rights reserved.',
  },
  bag: {
    title: 'Bag',
    emptyBody: 'Your bag is empty.',
    startShopping: 'Start shopping',
    open: 'Open bag',
    close: 'Close bag',
    /* I18N-07: the registry carries both forms; nothing pluralises by hand. */
    itemsOne: '1 item',
    itemsOther: '{count} items',
    quantityLabel: 'Quantity',
    increase: 'Increase quantity',
    decrease: 'Decrease quantity',
    remove: 'Remove',
    removeTitle: 'Remove this item?',
    removeBody: 'It will be released back into stock straight away.',
    removeConfirm: 'Remove it',
    removeCancel: 'Keep it',
    subtotal: 'Subtotal',
    discount: 'Discount',
    delivery: 'Delivery',
    deliveryFree: 'Free',
    total: 'Total',
    freeDeliveryRemaining: 'Spend {amount} more for free delivery',
    freeDeliveryMet: 'You have free delivery',
    promoLabel: 'Promotional code',
    promoPlaceholder: 'Enter a code',
    promoApply: 'Apply',
    promoRemove: 'Remove code',
    checkout: 'Go to checkout',
    checkoutPending: 'Checkout arrives with M5',
    /* §7.1: the refusal names the piece, so the copy has a slot for it. */
    unavailable: '{piece} in size {size} is no longer available.',
    addFailed: 'We could not add that. Please try again.',
    updateFailed: 'We could not update your bag. Please try again.',
    unreachable: 'We could not reach your bag.',
    /* §28.2's durable hold, stated plainly rather than as a countdown. */
    heldUntil: 'Held for you until {time}',
    /*
     * "Held until" states a time without saying what happens at it, and a
     * customer reading it has to guess between three different outcomes. These
     * answer all three, in the order they occur to someone: is it really mine,
     * what happens at that time, and what do I do about it.
     */
    heldInfoLabel: 'What does this mean?',
    heldInfoTitle: 'About holding items',
    heldInfoReserved:
      'These items are genuinely reserved. Nobody else can buy them while your bag holds them, even if they are the last ones in stock.',
    heldInfoExpiry:
      'At that time the hold ends and the items go back on sale to everyone. They also leave your bag, so nothing sits there quietly out of stock.',
    heldInfoAction:
      'You can add them again afterwards if they are still available. Finishing checkout before then keeps them for good.',
    heldInfoExtend: 'Changing your bag renews the hold, so you are not racing a clock while you shop.',
    viewBag: 'View bag',
  },
  catalogue: {
    title: 'Catalogue',
    breadcrumbHome: 'Home',
    productCount: { one: '{count} product', other: '{count} products' },
    noResultsHeading: 'Nothing matches those filters',
    noResultsBody: 'Try removing a filter, or browse the whole catalogue.',
    clearFilters: 'Clear all filters',
    browseAll: 'Browse everything',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    paginationLabel: 'Pagination',
    goToPage: { one: 'Go to page {count}', other: 'Go to page {count}' },
    quickAdd: 'Quick add',
    quickAddPending: 'Quick add arrives with the bag',
    quickView: 'Quick view',
    filtersHeading: 'Filters',
    filterGroups: {
      fabric: 'Fabric',
      colour: 'Colour',
      garmentType: 'Garment type',
      pieceCount: 'Pieces',
    },
    filterPrice: 'Price',
    filterAvailability: 'Availability',
    filterAdd: 'Apply this filter',
    filterRemove: 'Remove this filter',
    facetsUnavailable: 'Filter counts are unavailable right now.',
    activeFiltersLabel: 'Active filters',
    removeFilter: 'Remove {label}',
    inStockOnly: 'In stock only',
    priceMinLabel: 'Minimum price',
    priceMaxLabel: 'Maximum price',
    priceApply: 'Apply price',
    priceRange: '{min} to {max}',
    priceFrom: 'From {min}',
    priceUpTo: 'Up to {max}',
    sort: {
      label: 'Sort by',
      NEWEST: 'Newest',
      PRICE_ASC: 'Price: low to high',
      PRICE_DESC: 'Price: high to low',
      RELEVANCE: 'Most relevant',
    },
  },
  search: {
    title: 'Search',
    inputLabel: 'Search products',
    placeholder: 'Boski, karandi, a product code…',
    submit: 'Search',
    resultsHeading: 'Results',
    exactMatchHeading: 'Exact match for this code',
    suggestionsLabel: 'Search suggestions',
    suggestionsProductsLabel: 'Matching products',
    noResultsHeading: 'No results',
    noResultsBody: 'Check the spelling, try a fabric name, or browse the catalogue.',
  },
  theme: {
    switchToDark: 'Switch to dark mode',
    switchToLight: 'Switch to light mode',
  },
  errors: {
    network: 'We could not reach the store. Please try again.',
    unexpected: 'Something went wrong. Please try again.',
  },
} as const;

/**
 * `en` keeps `as const` so its literal values stay available, but every other
 * locale must be free to hold *different* strings while matching the structure
 * exactly. `Messages` therefore widens the leaves to `string` and preserves the
 * key shape, so a missing or misspelled Urdu key remains a compile error.
 *
 * Deviation stated (§22-J): the illustrative snippet in guidelines §4.7 types
 * the second locale as `typeof en` directly. Combined with `as const` that
 * demands byte-identical strings, which no translation can satisfy — it does
 * not compile. This preserves the rule's intent rather than its example.
 */
type WidenLeaves<T> = { [K in keyof T]: T[K] extends string ? string : WidenLeaves<T[K]> };

export type Messages = WidenLeaves<typeof en>;
