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
    /* §34 — the one call to action the header carries. At phone width it
       collapses to the icon, and this text stays on as its accessible name. */
    stitchedCta: 'Stitched to size',
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
    cancel: 'Cancel',
  },
  product: {
    /* §34 — the made-to-measure fork under Add to bag. Drawn only when the
       backend offers stitching for the product, the way the Fabric Calculator
       is. */
    stitchingForkHeading: 'Or have it stitched to your measurements',
    stitchingForkBody:
      'Measure a garment you already own, and we will cut this one to the same fit. Ready in about {days} days.',
    stitchingForkCta: 'Take my measurements',
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
    signInBody: 'Sign in with your email and password, or with a code sent to your mobile.',
    signUpHeading: 'Create an account',
    signUpBody: 'Save your details for faster checkout, and keep a wishlist.',
    /* §11 offers two ways in, and neither is a fallback for the other. */
    methodLabel: 'How would you like to sign in?',
    methodPassword: 'Email and password',
    methodCode: 'Mobile code',
    nameLabel: 'Full name',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    confirmPasswordLabel: 'Confirm password',
    mobileLabel: 'Mobile number',
    codeLabel: 'Six-digit code',
    passwordHint: 'At least 8 characters. A phrase you can remember beats a short jumble.',
    signInCta: 'Sign in',
    signUpCta: 'Create account',
    sendCodeCta: 'Send me a code',
    verifyCta: 'Sign in',
    resendCode: 'Send another code',
    forgotPassword: 'Forgot your password?',
    noAccount: 'Create an account',
    haveAccount: 'Already have an account?',
    codeSent: 'If that number has an account, a code is on its way. It expires in five minutes.',
    /*
     * §11: "authentication responses never reveal whether an account exists", so
     * a wrong password, an unknown email and a locked account all say this.
     */
    signInRefused: 'Those details did not match. Please check them and try again.',
    codeRefused: 'That code did not work. It may have expired or been used already.',
    tooManyAttempts: 'Too many attempts. Please wait a few minutes and try again.',
    emailTaken: 'An account already exists for that email address.',
    signUpFailed: 'We could not create your account. Please try again.',
    emailInvalid: 'Enter a valid email address.',
    passwordTooShort: 'Use at least 8 characters.',
    passwordsDiffer: 'Both passwords must match.',
    nameInvalid: 'Please enter your name.',
    mobileInvalid: 'Enter a valid mobile number.',
    /* D3 — shown only while the mock layer is armed. */
    testAccountHeading: 'Test account',
    testAccountEmail: 'Email',
    testAccountPassword: 'Password',
    testCode: 'Test code',
    accountMenuLabel: 'Your account',

    signOut: 'Sign out',
    resetHeading: 'Reset your password',
    resetBody: 'Enter your email address and we will send you a link.',
    resetCta: 'Send reset link',
    resetSent: 'If that address has an account, a reset link is on its way.',
    backToSignIn: 'Back to sign in',
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
    /* §34 — a standing invitation, not a claim about any line in the bag. */
    stitchingNudge: 'Want the next one made to your measurements?',
    stitchingNudgeCta: 'Measure a garment you own',
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
    heldInfoExtend:
      'Changing your bag renews the hold, so you are not racing a clock while you shop.',
    viewBag: 'View bag',
  },
  checkout: {
    title: 'Checkout',
    /* §28.2: guest checkout. No account is required to buy. */
    contactHeading: 'Contact details',
    nameLabel: 'Full name',
    mobileLabel: 'Mobile number',
    emailLabel: 'Email address (optional)',
    addressHeading: 'Delivery address',
    addressLabel: 'Address',
    addressPlaceholder: 'House and street, area',
    cityLabel: 'City',
    deliveryHeading: 'Delivery',
    paymentHeading: 'Payment',
    giftHeading: 'Gift options',
    giftToggle: 'This is a gift',
    giftMessageLabel: 'Message on the gift card',
    giftMessagePlaceholder: 'Written on the card, not shown on the invoice',
    summaryHeading: 'Your order',
    subtotal: 'Subtotal',
    discount: 'Discount',
    delivery: 'Delivery',
    deliveryFree: 'Free',
    gift: 'Gift wrapping',
    total: 'Total',
    place: 'Place order',
    placing: 'Placing your order…',
    emptyTitle: 'There is nothing to check out',
    emptyBody: 'Your bag is empty, so there is no order to place.',
    browse: 'Browse the catalogue',
    /* §7.2 step 2 — the price moved, so the customer confirms the new one. */
    priceChangedTitle: 'The total has changed',
    priceChangedBody:
      'Prices or availability changed while you were filling this in. Please check the new total below and place the order again if you are happy with it.',
    /* §7.2 step 1 — a hold lapsed, and the answer names what lapsed. */
    expiredTitle: 'Some items are no longer held',
    expiredBody: 'These went back on sale before you finished: {items}. Please review your bag.',
    backToBag: 'Back to the bag',
    failedTitle: 'We could not place your order',
    failed: 'We could not place your order. Nothing has been charged. Please try again.',
    /* Errors, in the customer's words rather than the validator's (ERR-11). */
    nameInvalid: 'Please enter your full name.',
    mobileInvalid: 'Enter a mobile number like {example}.',
    emailInvalid: 'Enter a valid email address, or leave it blank.',
    addressInvalid: 'Please enter your address.',
    cityInvalid: 'Please enter your city.',
    methodUnavailable: 'Not available for this order',
  },
  order: {
    title: 'Order confirmed',
    /* Prominent, because §28.3 tracks a guest order by exactly this. */
    numberLabel: 'Order number',
    placedLabel: 'Placed',
    deliveringTo: 'Delivering to',
    paymentLabel: 'Payment',
    itemsHeading: 'What you ordered',
    total: 'Total',
    giftNote: 'Wrapped as a gift',
    continueShopping: 'Continue shopping',
    notFound: 'We could not find that order.',
  },
  /**
   * §28.3's account area. A guest has one too: measurements save against this
   * browser before anyone signs in, so the page says where they are kept rather
   * than pretending there is nothing there.
   */
  account: {
    title: 'Your account',
    navLabel: 'Your account',
    detailsHeading: 'Your details',
    nameLabel: 'Name',
    emailLabel: 'Email',
    mobileLabel: 'Mobile',
    detailsPlaceholder:
      'Signing in is a placeholder while real accounts are built, so please do not put real personal details in here yet.',
    guestHeading: 'You are not signed in',
    guestBody:
      'You can still use the shop. Your measurements are kept on this browser, and signing in does not move them across yet.',
    measurementsHeading: 'Your measurements',
    measurementsEmpty: 'You have not saved any measurements yet.',
    measurementsEmptyCta: 'Take your measurements',
    measurementsUnavailable:
      'Your measurements are on file, but the measuring guide could not be loaded to show them. Please try again.',
    measurementsUnreadable:
      'We could not reach your saved measurements just now. Anything you have saved is still on file — please try again in a moment.',
    keptOnThisBrowser: 'These are kept on this browser only, and are not linked to an account.',
    savedOn: 'Saved on {date}, {path}.',
    openMeasurements: 'Open these measurements',
    figuresUnavailable:
      'We could not load the measuring guide for these, so the figures are not shown here. They are still on file.',
    figuresNotAsked: {
      one: '{count} more figure is on file that the guide no longer asks for.',
      other: '{count} more figures are on file that the guide no longer asks for.',
    },
    ordersHeading: 'Your orders',
    ordersEmpty: 'You have not placed an order yet.',
    ordersUnavailable:
      'We could not reach your orders just now. Anything you have ordered is still on file — please try again in a moment.',
    /* §28.3 — a guest order carries no customer, so it is found by its number.
       Nothing here promises tracking: there is none, and saying so would be a
       promise nothing behind it can keep. */
    ordersGuestBody:
      'Orders you place while signed in are listed here. An order placed as a guest is kept against its order number instead — the number on your confirmation is how you return to it.',
    /* I18N-06 — the whole phrase, so a translation can put the count first. */
    ordersMoreItems: { one: '{item} and {count} more', other: '{item} and {count} more' },
    ordersView: 'View',
    addressesHeading: 'Your addresses',
    addressesLead:
      'An address saved here is offered at checkout. Signing in is a placeholder while real accounts are built, so please do not save a real address yet.',
    addressesEmpty: 'You have not saved an address yet.',
    addressesUnavailable:
      'We could not reach your saved addresses just now. Anything you have saved is still on file — please try again in a moment.',
    addressesFull: 'You have saved as many addresses as we keep. Remove one to add another.',
    addressGone: 'That address is no longer in your book. It may have been removed in another tab.',
    addressesSignedOut: 'Your session has ended. Please sign in again to change your addresses.',
    addressSavedStatus: 'Address saved.',
    addressRemovedStatus: 'Address removed.',
    addressDefaultStatus: 'Default address changed.',
    addressesGuestHeading: 'Sign in to save an address',
    addressesGuestBody:
      'A saved address belongs to your account, so it is there the next time you order. You can still check out without one.',
    addressesManage: 'Manage addresses',
    addressDefaultLead: 'Your next order goes here unless you choose otherwise.',
    addressDefaultMark: 'Default',
    addressAddCta: 'Add an address',
    addressAddHeading: 'Add an address',
    addressEditHeading: 'Edit this address',
    addressAdd: 'Save address',
    addressSaveChanges: 'Save changes',
    addressEdit: 'Edit',
    addressMakeDefault: 'Make default',
    addressRemove: 'Remove',
    recipientLabel: 'Who receives it',
    recipientHint: 'The name the courier will ask for.',
    addressUseSaved: 'Use a saved address',
    addressPickerHint:
      'Choosing one fills the fields below. You can change them for this order without changing what is saved.',
    addressSaveOffer: 'Save this address for next time',
    addressSaved: 'Saved to your addresses.',
    savedItemsHeading: 'Your saved items',
    savedItemsGuest:
      'A saved list belongs to an account, so there is nothing kept here yet. Sign in, and the heart on any product will keep it with you.',
    savedItemsUnavailable:
      'We could not reach your saved items just now. Anything you have saved is still on file — please try again in a moment.',
    openSavedItems: 'See your saved items',
  },
  /** §28.3's saved items. */
  wishlist: {
    title: 'Saved items',
    savedCount: { one: '{count} saved item', other: '{count} saved items' },
    emptyHeading: 'Nothing saved yet',
    emptyBody: 'Tap the heart on any product to keep it here.',
    signedOutHeading: 'Sign in to see your saved items',
    signedOutBody: 'Your saved list belongs to your account, so it follows you between visits.',
    /* A product withdrawn from sale since it was saved. */
    withdrawn: {
      one: '{count} saved item is no longer available and is not shown.',
      other: '{count} saved items are no longer available and are not shown.',
    },
    unreachable: 'We could not load your saved items. Please try again.',
    /* What this browser was holding, now kept with the account instead. */
    carried: {
      one: '{count} item you saved on this browser is now kept with your account.',
      other: '{count} items you saved on this browser are now kept with your account.',
    },
    navLabel: 'Saved items',
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
    /* The small-screen layout switcher. `{count}` is the column count. */
    layoutLabel: 'Grid layout',
    layoutOption: 'Show {count} per row',
    goToPage: { one: 'Go to page {count}', other: 'Go to page {count}' },
    quickAdd: 'Quick add',
    quickAddPending: 'Quick add arrives with the bag',
    quickView: 'Quick view',
    /* §28.1's card actions. */
    wishlistAdd: 'Save to wishlist',
    wishlistChangeFailed: 'We could not change your saved items. Please try again.',
    wishlistRemove: 'Remove from wishlist',
    quickAddOpen: 'Choose a size',
    quickAddClose: 'Close sizes',
    quickAddFailed: 'Could not add. Please try again.',
    previousImage: 'Previous image',
    nextImage: 'Next image',
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
    /* §28.1's full-width search panel. */
    overlayPlaceholder: 'What are you looking for today?',
    refinementsHeading: 'Narrow by',
    trendingHeading: 'Trending searches',
    suggestionsHeading: 'Suggestions',
    bestSellersHeading: 'Best sellers',
    productsHeading: 'Products',
    viewAll: 'View all',
    viewAllTerm: 'View all "{term}"',
    clear: 'Clear search',
    close: 'Close search',
    resultCount: '{count} results',
    title: 'Search',
    inputLabel: 'Search products',
    placeholder: 'Boski, karandi, a product code…',
    submit: 'Search',
    resultsHeading: 'Results',
    suggestionsLabel: 'Search suggestions',
    suggestionsProductsLabel: 'Matching products',
    noResultsHeading: 'No results',
    noResultsBody: 'Check the spelling, try a fabric name, or browse the catalogue.',
  },
  theme: {
    switchToDark: 'Switch to dark mode',
    switchToLight: 'Switch to light mode',
  },
  /**
   * Architecture §24 Try-On.
   *
   * `fitNotice` is the load-bearing string in this block and it is not a
   * disclaimer bolted on at the end. A generated image cannot know whether this
   * customer takes a small or a large, so it must not be read as a fit preview —
   * which is why nothing in the request carries a size, and why this sentence
   * appears beside the result rather than in small print under it.
   */
  tryOn: {
    launch: 'Try it on',
    launchHint: 'See this piece on a photo of you',
    title: 'Try it on',
    close: 'Close try-on',
    intro: 'Upload a photo and see how this piece and its colour look on you.',
    fitNotice:
      'This shows colour and appearance only. It cannot tell you how a size will fit — the size guide is for that.',
    guidanceHeading: 'For the best result',
    guidanceFraming: 'Stand facing the camera, head to knee in the frame.',
    guidanceLight: 'Use a plain wall and even, natural light.',
    guidanceClothes: 'Wear close-fitting clothes so your outline reads clearly.',
    guidanceAlone: 'Just you in the photo.',
    privacyHeading: 'What happens to your photo',
    privacyNote:
      'Your photo is used to make this one image and is never stored. It is discarded as soon as the image comes back — and if anything fails.',
    choosePhoto: 'Choose a photo',
    changePhoto: 'Choose a different photo',
    chosenAlt: 'The photo you chose',
    generate: 'Try it on',
    generating: 'Creating your image',
    generatingNote: 'This can take up to half a minute.',
    /*
     * The three captions of the waiting state, crossfading in this order. They
     * describe what the module genuinely does — correct the photograph's
     * colour, read the garment, compose the two — rather than inventing
     * progress it cannot measure.
     */
    phaseReading: 'Reading your photo',
    phaseColour: 'Matching the colour',
    phasePlacing: 'Placing the piece',
    resultHeading: 'You in this piece',
    resultAlt: 'A generated image of you wearing {product}',
    startAgain: 'Try another photo',
    unavailableDisabled:
      'Try-on is not switched on yet. Everything else on this page works as usual.',
    unavailableFailed: 'We could not create the image this time. Please try again.',
    unavailableTimeout: 'That took longer than expected. Please try again.',
    photoTooLarge: 'That photo is too large. Please choose one under {limit} MB.',
    photoWrongFormat: 'That file is not a photo we can use. Please choose a JPEG, PNG or WebP.',
    photoEmpty: 'Please choose a photo first.',
  },
  /**
   * §34 Made-to-Measure — the studio's own interface copy.
   *
   * The names of the styles and garments, and every point's label and
   * instruction, are NOT here: the measurement list is served content, and its
   * words come from Localisation by id (§34.3), so a point the tailor adds needs
   * no release. See `measurement-copy.schema.ts`.
   */
  madeToMeasure: {
    pageTitle: 'Stitched to your size',
    pageLead:
      'Measure clothes you already own, laid flat. It is easier than measuring yourself, and it copies a fit you have already approved.',
    figureHint:
      'Choose a measurement below, or tap a mark on the drawing, and we will show you where the tape goes.',
    garmentLabel: 'Garment',
    styleLabel: 'What are you having stitched?',
    styleHint: 'Switching keeps the figures you have already typed.',
    styleNow: '{style}: {count} measurements to take.',
    styleNowPath: '{style}, {path}: {count} measurements to take.',
    styleFallback:
      'We do not stitch that style at the moment, so these are the measurements for {style}.',
    unavailable:
      'The measuring guide could not be loaded. You can try again, or shop in standard sizes meanwhile.',
    browseStandard: 'Shop standard sizes',
    pageLeadCard: 'Copy the figures from your tailor’s card or note, exactly as they are written.',
    sourceLabel: 'How are you measuring?',
    sourceGarment: 'Copy a garment I own',
    sourceCard: 'Copy my tailor’s card',
    sourceHint: 'Figures typed on one stay there; they are not copied to the other.',
    sourceFallback: '“{requested}” is not offered for this style yet, so this is “{served}”.',
    cardHint: 'Type each figure exactly as the card writes it — 19½ as 19.5. We do any doubling.',
    halfWidthHint: 'Measure half the width, as the line shows. We double it.',
    readoutHalf: '{half} half → {whole} whole',
    readoutHalfTyped: '{value} half',
    noteChoose: 'Choose a photo of your card',
    noteReplace: 'Choose another photo',
    notePrivacy: 'The photo stays on this device. It is never sent to us.',
    noteViewLabel: 'Show',
    noteViewNote: 'Your card',
    noteViewDrawing: 'Drawing',
    noteAlt: 'Your tailor’s card',
    noteUnreadable:
      'This photo cannot be shown here. Try a JPEG or PNG — a screenshot of it works too.',
    noteZoomIn: 'Enlarge the photo',
    ringHint: 'Measure straight across the garment laid flat. We double it.',
    spanHint: 'Measure in a straight line, without pulling the tape tight.',
    fullGirthHint: 'Read the whole length of the tape. Do not double it.',
    unitLabel: 'Measure in',
    unitInches: 'Inches',
    unitCentimetres: 'Centimetres',
    unitShortInches: 'in',
    unitShortCentimetres: 'cm',
    readout: '{value} {unit}',
    readoutRing: '{across} across → {around} around',
    readoutAround: '{value} around',
    readoutAcross: '{value} across',
    progress: '{done} of {total} required measurements taken',
    optionalLabel: '{label} (optional)',
    choicesHint:
      'Choose how the garment you are measuring is finished. The measurements below follow your choices, and anything you have typed is kept.',
    choicesHintCard:
      'Choose how your garment is to be finished. It does not change what the card asks for.',
    errorSummaryTitle: 'Check these measurements',
    outOfRange: 'Enter a value between {min} and {max} {unit}.',
    cutNotice:
      'When you order stitching, the cloth is cut to these numbers, so a stitched order cannot be returned or exchanged.',
    /* A2-8 — measurements this customer has already saved, OFFERED rather than
       applied. Nothing says "we have filled these in for you", because nothing is
       filled in until the button is pressed: cloth is cut from these figures. */
    reuseTitle: 'You have measurements saved',
    reuseFrom: 'Saved on {date}, from your {style}.',
    reuseBorrowed:
      'Some of these were taken for a different garment. Every measurement is taken the same way, so they fit here too.',
    reuseCta: 'Use my saved measurements',
    reuseFilled:
      '{count} measurements filled in from your saved {style}. Look at each one before you save.',
    reuseSetAside:
      'We could not carry over {points}. The range for that measurement has changed since you saved it, so please take it again.',
    saveCta: 'Check my measurements',
    checking: 'Checking…',
    storeUnreachable:
      'We could not reach the store. Your figures are still here — please try again.',
    checkStale:
      'The measuring guide has changed since you opened this page. The figures you typed will stay.',
    loadNewGuide: 'Load the new guide',
    findingRequired: 'This measurement is needed.',
    findingUnreadable: 'Type the figure in numbers, such as 19.5.',
    findingOrder:
      'This does not agree with the {related}. Measure this again, and the {related} too.',
    findingOrderBelow:
      'This came out smaller than the {related}, which cannot be right. Measure this again, and the {related} too.',
    findingOrderAbove:
      'This came out larger than the {related}, which cannot be right. Measure this again, and the {related} too.',
    findingDeviation: 'This is unusual beside your other figures. Measure it again.',
    findingOrderCard: 'This does not agree with the {related}. Check both against the card.',
    findingOrderBelowCard:
      'This came out smaller than the {related}, which cannot be right. Check both against the card.',
    findingOrderAboveCard:
      'This came out larger than the {related}, which cannot be right. Check both against the card.',
    findingDeviationCard: 'This is unusual beside your other figures. Check it against the card.',
    noteSmaller:
      'This is smaller than usual beside your {related}. Cloth cut too small cannot be let out.',
    noteLarger: 'This is larger than usual beside your {related}.',
    noteUnusual: 'This is unusual beside your other figures.',
    noteSmallerCard:
      'This is smaller than usual beside the {related} on the card. Cloth cut too small cannot be let out.',
    noteLargerCard: 'This is larger than usual beside the {related} on the card.',
    noteUnusualCard: 'This is unusual beside the card’s other figures.',
    noteAsk: 'Measure it again, or tell us to keep your number.',
    noteAskCard: 'Check it against the card, or tell us to keep the card’s figure.',
    noteMeasureAgain: 'Measure again',
    noteCheckCard: 'Check the card again',
    noteKeep: 'Keep my number',
    noteKeepCard: 'Keep the card’s figure',
    noteKept: 'You are keeping this number. We note that you checked it.',
    noteKeptCard:
      'You are keeping the card’s figure. We note that you checked it against the card.',
    noteSummaryTitle: 'Worth a second look',
    noteSummaryLead: 'Each of these has a note under it. Measure it again, or keep your number.',
    noteSummaryLeadCard:
      'Each of these has a note under it. Check it against the card, or keep the card’s figure.',
    noteSummaryDone: 'Every note is answered. Check your measurements again to see the review.',
    findingLooksWhole:
      'This looks like the whole way round, but this one is measured across the garment laid flat — half of it. Measure across instead.',
    findingLooksWholeCard:
      'This looks like a whole figure, but we read this one off the card as half. If your card gives the whole, halve it here.',
    findingLooksHalf:
      'This looks like half a figure, but this one is measured whole. Check the tape again.',
    findingLooksHalfCard:
      'This looks like half a figure, but we read this one off the card as a whole. If your card gives half, double it here.',
    reviewTitle: 'Check them before we save them',
    reviewLead:
      'Each figure as you typed it, and as it will be kept. The kept figure is the one a tailor works from.',
    reviewColumnPoint: 'Measurement',
    reviewColumnTyped: 'As you typed it',
    reviewColumnRecorded: 'As it will be kept',
    reviewChange: 'Change',
    reviewChangeLabel: 'Change {label}',
    reviewKeptLead: 'Figures you chose to keep after a note are marked below.',
    reviewKept: 'You checked this and kept it.',
    saveProfileCta: 'Save my measurements',
    saving: 'Saving…',
    backToForm: 'Change something',
    savedTitle: 'Your measurements are saved',
    savedFirst: 'We have your {style} measurements.',
    savedReplaced: 'These replace the {style} measurements you saved before.',
    savedAccount: 'They are kept with your account.',
    savedDevice: 'They are saved for this browser only, and are not linked to an account.',
    savedOnward: 'Browse the collection',
    savedSeeAll: 'See your saved measurements',
    measureAgain: 'Change and save again',
    stepPrevious: 'Previous',
    stepNext: 'Next',
    stepDone: 'Done',
    stepPosition: '{current} of {total}',
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
