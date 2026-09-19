import { enRootError } from './en-root-error';

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
    retry: enRootError.retry,
    /* A part of the page downloaded on demand (the bag panel, search, the
       studio's review) whose code did not arrive. Said in its place, beside
       Try again, so the page around it and anything typed into it stay. */
    partUnavailable: 'This part of the page could not be loaded. Please try again.',
    viewAll: 'View all',
    submit: 'Submit',
    cancel: 'Cancel',
    /* The name every breadcrumb trail carries, so a screen reader hears what the
       navigation is rather than the title of the page it sits on. */
    breadcrumbLabel: 'Breadcrumb',
    /* Read after the name of a link that leaves the store in a new tab or app,
       so nobody is taken somewhere they did not expect (SEC-09's links). */
    opensInNewTab: '(opens in a new tab)',
  },
  product: {
    /* §34 — the made-to-measure fork under Add to bag. Drawn only when the
       backend offers stitching for the product, the way the Fabric Calculator
       is. */
    stitchingForkHeading: 'Or have it stitched to your measurements',
    stitchingForkBody:
      'Measure a garment you already own, and we will cut this one to the same fit. Ready in about {days} days.',
    stitchingForkCta: 'Take my measurements',
    /* §34 — on the CARD. Not a badge: badge precedence would hide it behind
       "Sold out", which is when a customer wants it most.
       The store's own short name for the feature, so a customer meets the same
       words in the header, on the card and in the buy box — with "can be" in
       front, because on a tile this is an OFFER and not a claim about the
       garment in the photograph. It has to fit a 104px tile at three columns. */
    madeToMeasureMark: 'Can be stitched to size',
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
    /*
     * §28.2's full-screen view. `{index}` and `{count}` arrive formatted, `{name}`
     * is the product as served. `openFullscreen` names the main photograph's
     * button; `imagePosition` is read out politely as the frame changes.
     */
    openFullscreen: 'Open image {index} of {count} full screen',
    fullscreenTitle: 'Photographs of {name}',
    closeFullscreen: 'Close the full-screen view',
    imagePosition: 'Image {index} of {count}',
    selectSizeHeading: 'Size',
    unifiedSizeHeading: 'Size for the whole set',
    perPieceHeading: 'Adjust individual pieces',
    /* §28.2's size guide: the button beside a size selector, and the name of the
       dialog it opens over the product page. */
    sizeGuide: 'Size guide',
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
    /*
     * §28.2's sharing. `shareMessage` is the text WhatsApp opens with, already
     * written: `{name}` the product as served, `{store}` the store's own name
     * (`site.name`), `{url}` the product's canonical address. The customer can
     * still change it before sending — nothing is sent by the store.
     */
    shareOnWhatsApp: 'Share on WhatsApp',
    shareMessage: 'Have a look at {name} from {store}:\n{url}',
    copyLink: 'Copy link',
    linkCopied: 'Link copied.',
    /* When the browser refuses to copy. Never silent: the link is shown instead. */
    copyLinkManual: 'Your browser did not let us copy the link. Copy it from the box below.',
    productLinkLabel: 'Link to this product',
    backToCatalogue: 'Back to the catalogue',
    notFoundHeading: 'We could not find that product',
    /* Never "sold out": a sold-out product keeps its page, with Notify Me on it. */
    notFoundBody: 'The link may be out of date, or this product is no longer offered.',
    /* §28.2 — the related products at the foot of the page. A heading and nothing
       else: which products, and why, is the backend's answer, so no sentence here
       claims a reason ("similar", "matching") the rule may not have used. */
    relatedHeading: 'You may also like',
    /* A11Y-09 — the visually hidden heading over §28.2's information sections. */
    infoHeading: 'Product details',
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
  /*
   * §28.2's Notify Me, under a size selector that has sold-out sizes. §28.7's
   * back-in-stock email is what answers it, and the BACKEND sends it when the
   * size returns — so every sentence promises an email later and none says one
   * has been sent. None says whether an address belongs to an account.
   * `{product}` and `{piece}` arrive exactly as served (I18N-09); `{size}` is the
   * size's own label. `lead` is a guest's line and `leadAccount` a signed-in
   * customer's, who is written to at the address on the account.
   */
  backInStock: {
    lead: 'Sold out in your size? Choose it and we will email you when it is back.',
    leadAccount:
      'Sold out in your size? Choose it and we will email the address on your account when it is back.',
    sizeCta: 'Email me when size {size} is back',
    formLead: 'Size {size} is sold out. Where should we email you when it is back?',
    emailLabel: 'Email address',
    emailHint: 'We use this address only to tell you this size is back.',
    invalidEmail: 'Enter a valid email address.',
    submit: 'Email me',
    recordedProduct: 'We will email you when {product} is back in size {size}.',
    recordedPiece: 'We will email you when the {piece} in {product} is back in size {size}.',
    alreadyProduct: 'We already have a request to email you when {product} is back in size {size}.',
    alreadyPiece:
      'We already have a request to email you when the {piece} in {product} is back in size {size}.',
    inStock: 'Size {size} can be bought again. The sizes have been refreshed so you can choose it.',
    notOffered: 'Size {size} is no longer offered. Refresh the page to see the sizes there are.',
    unreachable: 'We could not take your request just now. Please try again.',
  },
  /*
   * §28.3's saved sizes. A size is saved only when a signed-in customer asks, per
   * size chart, and it is used for ONE thing: choosing that size on a product page
   * when the product comes in it and it is in stock. Nothing here says it filters
   * listings (§28.6), chooses in the quick add (the tray only marks it) or adds
   * anything to the bag. `{size}` and `{previous}` are sizes' own labels; `{sizeSet}`
   * is the chart's name as served. `mark` sits under the saved size in a selector,
   * and `sizeSavedName` is that size's whole name for a screen reader.
   */
  savedSizes: {
    mark: 'Your size',
    /* A size button's whole name when it is the saved one (I18N-06). */
    sizeSavedName: '{size} — your saved size',
    remember: 'Remember size {size}',
    remembered:
      'Size {size} is saved. On other products that come in it, we will choose it for you when it is in stock.',
    rememberedInstead:
      'Size {size} is saved in place of {previous}. On other products that come in it, we will choose it for you when it is in stock.',
    isSaved: 'Size {size} is your saved size.',
    prefilled: 'We have chosen your saved size. You can change it.',
    rememberUnreachable: 'We could not save your size just now. Please try again.',
    rememberGone:
      'That size is no longer offered, so it cannot be saved. Refresh the page to see the sizes there are.',
    signedOut: 'Your session has ended. Please sign in again to change your saved sizes.',
    heading: 'Your saved sizes',
    lead: 'On a product page we choose your saved size for you when the product comes in it and it is in stock. Nothing goes in your bag until you add it.',
    empty:
      'You have not saved a size yet. Choose a size on a product page and we will offer to remember it.',
    guest:
      'A saved size belongs to an account. Sign in, and a size you ask us to remember is chosen for you on product pages.',
    unavailable:
      'We could not reach your saved sizes just now. Anything you have saved is still on file — please try again in a moment.',
    forget: 'Forget',
    forgetLabel: 'Forget saved size {size} ({sizeSet})',
    forgotten: 'Saved size forgotten.',
    forgetGone:
      'That saved size had already changed, perhaps in another tab. The list now shows what is saved.',
    forgetUnreachable: 'We could not forget that size just now. Please try again.',
  },
  /* §28.4's help pages shown INSIDE another page — the size guide in a dialog on
     the product page. On their own address a page needs no words of ours. */
  help: {
    openFullPage: 'Open this guide on its own page',
    unavailable: 'This guide could not be loaded just now.',
  },
  /*
   * The Contact us page's details, drawn from the client profile (`CLIENT.contact`)
   * rather than from content. `hours` is one sentence with the day names and times
   * already formatted for the reader's language (I18N-06, I18N-08).
   */
  storeContact: {
    heading: 'How to reach us',
    phoneLabel: 'Phone',
    whatsAppLabel: 'WhatsApp',
    emailLabel: 'Email',
    addressLabel: 'Address',
    hoursLabel: 'Hours',
    hours: '{firstDay} to {lastDay}, {opens} to {closes}',
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
    /*
     * Unconditional, because it is true unconditionally: a code proves the number,
     * so ANY number signs in with one and a new number becomes a new customer.
     * "If that number has an account…" told a first-time customer to register
     * first, for a rule no system applies — and it hid nothing, since every
     * number was answered with the same sentence anyway.
     */
    codeSent: 'A code is on its way. It expires in five minutes.',
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
    signedOutStatus: 'You have signed out.',
    signOutFailed: 'We could not sign you out just now. Please try again.',
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
    /* §28.4's static pages: the store, and the terms it sells on. */
    storeHeading: 'Our store',
    aboutUs: 'About us',
    contactUs: 'Contact us',
    delivery: 'Delivery',
    returns: 'Returns and exchanges',
    termsOfSale: 'Terms of sale',
    privacy: 'Privacy',
    rightsReserved: 'All rights reserved.',
  },
  bag: {
    /* §34 — a standing invitation, not a claim about any line in the bag. */
    stitchingNudge: 'Want the next one made to your measurements?',
    stitchingNudgeCta: 'Measure a garment you own',
    title: 'Bag',
    emptyBody: 'Your bag is empty.',
    startShopping: 'Start shopping',
    /* The header's bag button, count included, as ONE message (I18N-06): the
       name and the count used to be two strings joined with a comma in the
       component. I18N-07: both plural forms live here; nothing pluralises by hand. */
    openWithCount: { one: 'Open bag, {count} item', other: 'Open bag, {count} items' },
    close: 'Close bag',
    quantityLabel: 'Quantity',
    increase: 'Increase quantity',
    decrease: 'Decrease quantity',
    remove: 'Remove',
    removeBody: 'It will be released back into stock straight away.',
    removeConfirm: 'Remove it',
    removeCancel: 'Keep it',
    /* Said aloud once a line is gone, because the line simply vanishes and focus
       has moved on — a screen-reader user would otherwise be told nothing. */
    removedStatus: '{item} removed from your bag.',
    /* §30.3 — a quantity change is announced too: the count changes in place and
       a screen-reader user would otherwise hear nothing. */
    quantityStatus: 'Quantity of {item} is now {count}.',
    /* §16 moveToWishlist — offered only to a signed-in customer, on a line picked
       off the shelf. The line leaves the bag and the product is kept for later. */
    moveToSaved: 'Move to saved items',
    movedStatus: '{item} moved to your saved items.',
    /* The line had already gone — another tab, or a lapsed hold — so nothing was saved. */
    moveNotInBag: 'That item had already left your bag, so it was not saved.',
    /* §34.8 — not offered on a cut line; this is the answer if a request asks anyway. */
    moveNotMovable:
      'An item being made to your measurements stays in your bag, because saving it would lose the measurements.',
    moveSignedOut: 'Your session has ended. Sign in again to move items to your saved items.',
    subtotal: 'Subtotal',
    discount: 'Discount',
    delivery: 'Delivery',
    deliveryFree: 'Free',
    total: 'Total',
    freeDeliveryRemaining: 'Spend {amount} more for free delivery',
    freeDeliveryMet: 'You have free delivery',
    /* The progress bar's name, true whether or not delivery is free yet; the
       sentence above it says which. */
    freeDeliveryProgressLabel: 'Progress towards free delivery',
    promoLabel: 'Promotional code',
    promoPlaceholder: 'Enter a code',
    promoApply: 'Apply',
    promoRemove: 'Remove code',
    /* §30.3 — said once a code is applied or lifted, because the form and the
       applied code swap places and nothing else says what happened. */
    codeAppliedStatus: 'Code {code} applied.',
    codeRemovedStatus: 'Code removed.',
    checkout: 'Go to checkout',
    /* §7.1: the refusal names the piece, so the copy has a slot for it. */
    unavailable: '{piece} in size {size} is no longer available.',
    addFailed: 'We could not add that. Please try again.',
    /* §34 — a made-to-measure add the backend refused. What to do, not why:
       the reason is not sent, and in every case the answer is the same. */
    measurementsRefused:
      'We could not use those measurements for this garment. Check them, save them again, then add it.',
    /* §16 — an add refused on the product or the sizes it named: withdrawn since
       the page loaded, or a size no longer offered. Same move whichever it was. */
    selectionRefused:
      'We could not add this as chosen. Refresh the page to see what is available now, then choose again.',
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
      'When the hold on an item ends, it goes back on sale to everyone and leaves your bag, so nothing sits there quietly out of stock. The time shown is when the first hold ends.',
    heldInfoAction:
      'You can add them again afterwards if they are still available. Finishing checkout before then keeps them for good.',
    /* True to §7.1: only the line that changed is re-reserved. This used to say
       that changing the bag renewed "the hold", and the other lines lapsed on
       their own clocks regardless. */
    heldInfoExtend:
      'Each item is held from when you last added it or changed its quantity, so changing one item renews the hold on that item only.',
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
    /* ERR-02 — the quote could not be READ, which is not the same as an empty bag
       and must never be told to someone as one. */
    unreachableTitle: 'We could not load your checkout',
    unreachableBody:
      'The store could not be reached just now. Nothing has been ordered or charged — please try again in a moment.',
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
    /* ERR-02 — no answer came back, which is not the same as a refusal: the order
       may exist. Nothing here claims it failed or that nothing was charged. */
    unconfirmedTitle: 'We could not confirm your order',
    unconfirmedBody:
      'The store did not answer in time, so your order may or may not have gone through. Please check your bag before placing it again: an order that went through empties it.',
    /* Errors, in the customer's words rather than the validator's (ERR-11). */
    nameInvalid: 'Please enter your full name.',
    mobileInvalid: 'Enter a mobile number like {example}.',
    emailInvalid: 'Enter a valid email address, or leave it blank.',
    addressInvalid: 'Please enter your address.',
    cityInvalid: 'Please enter your city.',
    /* No method was CHOSEN. Its own words: a method the backend refused says why
       beside the method itself. */
    methodRequired: 'Choose how you would like to pay.',
    /* §34.7 — the cut cutoff, stated BEFORE payment and on the same screen as
       the price, which the spec asks for explicitly. */
    /* No COUNT in the heading: "one item" is false the moment somebody orders
       two, and the backend sends a flag rather than a number. */
    cutCutoffHeading: 'Part of this order is being cut for you',
    cutCutoffBody:
      'Once we start cutting, a made-to-measure garment cannot be changed, cancelled or returned — it is made to your figures and fits nobody else.',
    /* Only when there IS something else. On an order of nothing but cut
       garments this sentence would promise something about nothing. */
    cutCutoffOthers: 'Everything else in this order can be returned as usual.',
    cutCutoffLeadTime: 'Allow about {days} days for it to be made, on top of delivery.',
    measurementsChangedTitle: 'Your measurements were saved again',
    measurementsChangedBody:
      'You saved your measurements again after {items} went into your bag, and we will not cut it without you adding it again. In your bag it is marked — remove it, then add it again from its page.',
  },
  order: {
    /* True in every state an order can be in. "Confirmed" was said of cash
       orders awaiting confirmation and transfers awaiting payment (§6.6). */
    title: 'Order placed',
    /* Prominent, because §28.3 tracks a guest order by exactly this. */
    numberLabel: 'Order number',
    placedOn: 'Placed: {date}',
    deliveringTo: 'Delivering to',
    paymentLabel: 'Payment',
    itemsHeading: 'What you ordered',
    total: 'Total',
    /* I18N-06 — whole messages, so a translator owns the order and the marks. */
    quantityTimes: '× {count}',
    giftNote: 'Wrapped as a gift',
    giftMessageQuoted: '“{message}”',
    continueShopping: 'Continue shopping',
    notFound: 'We could not find that order.',
    notFoundBody: 'Check the order number on your confirmation and try again.',
    /* The tab's title, true whether the order or the lookup below is showing. */
    pageTitle: 'Your order',
    /*
     * §28.3 — asked when nothing here shows who placed the order. The same words
     * for a number that names no order, so the page never says which ones exist.
     */
    lookupHeading: 'Find your order',
    lookupBody: 'Enter the mobile number this order was placed with to see it.',
    lookupSubmit: 'Show my order',
    lookupNotFound: 'We could not find an order with that number and mobile number.',
    lookupFailed: 'We could not check that just now. Please try again.',
    /*
     * An order paid by transfer carries where to pay. Checkout promises "our
     * account", so the confirmation has to name it — and the reference is the
     * order number the customer already has.
     */
    transferHeading: 'Paying by bank transfer',
    transferBody: 'Transfer the total to this account, with your order number as the reference.',
    transferAmount: 'Amount',
    transferReference: 'Reference',
    transferBank: 'Bank',
    transferAccountTitle: 'Account title',
    transferAccountNumber: 'Account number',
    transferIban: 'IBAN',
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
    /* I18N-10 — a saved set's heading when the guide has no name for its style in
       this language, or could not be read: never an empty heading. */
    savedMeasurementsUntitled: 'Saved measurements',
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
    /* §28.3 — the history a page at a time, as links that work without JavaScript. */
    ordersShowMore: 'Show more orders',
    ordersShowOlder: 'Show older orders',
    ordersBackToLatest: 'Back to your latest orders',
    ordersNoneOlder: 'There are no older orders.',
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
    /* A11Y-04 — every card repeats the three words above, so each button's NAME
       says which address it acts on, and starts with the word on screen. */
    addressEditLabel: 'Edit address: {recipient}, {line}',
    addressMakeDefaultLabel: 'Make default address: {recipient}, {line}',
    addressRemoveLabel: 'Remove address: {recipient}, {line}',
    /* One line in the checkout picker; the separator is the language's own. */
    addressInline: '{line}, {city}',
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
  /** §34.8 — a garment being cut, in the bag and on the order. */
  stitched: {
    /* Instead of the size row a picked garment shows. */
    madeToMeasure: 'Made to your measurements',
    fromProfile: '{style}, saved on {date}',
    figures: { one: '{count} measurement', other: '{count} measurements' },
    garmentPrice: 'Garment',
    charge: 'Stitching',
    leadTime: 'About {days} days to make',
    /* §34.7 again, where the garment is listed rather than priced. */
    noReturns: 'Cannot be returned once cutting starts',
    /* The line placement will refuse. What to do, in a step the bag offers. */
    measurementsChanged:
      'You saved your measurements again after adding this. Remove it, then add it again from its page.',
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
    /* Adding a saved product to the bag MOVES it: it leaves this list. Said aloud,
       because the card simply disappears from the grid. */
    movedToBag: '{item} moved to your bag.',
    /* The add went in and the list could not be changed — both halves are true. */
    movedToBagKept: '{item} is in your bag, but we could not take it off your saved items.',
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
    /* A11Y-09 — the visually hidden heading between the page's h1 and the cards. */
    productsHeading: 'Products',
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
    /*
     * §30.3 — read by a polite live region after a filter, a sort or a page
     * changes the listing. `{products}` is `productCount` already filled in, and
     * `{filters}` the applied filters as the chips name them, joined as a list.
     */
    listingStatus: '{products}. Sorted by {sort}. Page {page} of {pages}.',
    listingStatusFiltered: '{products} with {filters}. Sorted by {sort}. Page {page} of {pages}.',
    /* §28.1's card actions. */
    wishlistAdd: 'Save to wishlist',
    wishlistChangeFailed: 'We could not change your saved items. Please try again.',
    quickAddOpen: 'Choose a size',
    quickAddClose: 'Close sizes',
    quickAddFailed: 'Could not add. Please try again.',
    /* §7.1 names the piece that ran out. Short for the tile, but a whole
       sentence: "Kameez · M" alone never said the add had failed. */
    quickAddUnavailable: '{piece} in {size} has just sold out.',
    quickAddRefused: 'Not available as shown. Refresh the page.',
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
      /* The sort control's full name, as one message (I18N-06). */
      trigger: '{label}: {value}',
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
    /* §30.3 — read once the panel's answer arrives, and never while it is on its
       way. It counts the products SHOWN: the panel draws at most four, however
       many matched. */
    resultCount: { one: '{count} product shown', other: '{count} products shown' },
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
    /*
     * With no provider connected the result is the garment's own catalogue
     * photograph — the model it was shot on, NOT the customer. Heading, alt text
     * and a visible line all say so, so nobody reads it as their own likeness.
     */
    sampleHeading: 'A sample, not your photo',
    sampleAlt: 'The catalogue photograph of {product}, worn by the model it was shot on',
    sampleLabel:
      'Sample only. Try-on is not connected yet, so this is the catalogue photograph of the model this piece was shot on — not an image of you.',
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
    /* A switch of list whose read failed: the list in use stays, with the figures. */
    listUnloaded:
      'That measuring guide could not be loaded just now. The one below is the guide you were using, and your figures are still in it.',
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
    /* §34 — the product the studio was opened from. Two lines rather than one
       sentence: the picture and the name answer "which garment", and the link
       under them answers "how do I get back", which are different questions. */
    productFor: 'Measuring for',
    /* Not "Back to {product}": the name is on the line above, inside the same
       link, so a screen reader would read the garment out twice. */
    productBack: 'Back to this garment',
    /* The way into the bag, at the end. It says what the charge is FOR rather
       than repeating the button — the button is the bag's own. */
    productBagHint: 'This will be cut to the measurements you have just saved.',
    savedOnward: 'Browse the collection',
    savedSeeAll: 'See your saved measurements',
    measureAgain: 'Change and save again',
    stepPrevious: 'Previous',
    stepNext: 'Next',
    stepDone: 'Done',
    stepPosition: '{current} of {total}',
  },
  /*
   * The store's own "not found" page, in the reader's language — the framework's
   * default is English whatever the page's direction. Product and order pages
   * say it in their own words (`product.notFound*`, `order.notFound*`).
   */
  notFound: {
    heading: 'We could not find that page',
    body: 'The link may be out of date, or the address may have been typed wrong.',
    homeCta: 'Go to the homepage',
    catalogueCta: 'Browse the catalogue',
  },
  errors: {
    network: 'We could not reach the store. Please try again.',
    unexpected: enRootError.unexpected,
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
