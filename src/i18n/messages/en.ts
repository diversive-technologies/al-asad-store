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
    bag: 'Bag',
    signIn: 'Sign in',
    skipToContent: 'Skip to content',
    primaryLabel: 'Primary navigation',
    footerLabel: 'Footer navigation',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
  common: {
    switchToUrdu: 'اردو',
    switchToEnglish: 'English',
    languageGroupLabel: 'Language',
    loading: 'Loading…',
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
    pieceCountLabel: 'Pieces',
    originalPriceLabel: 'Was',
    metreageLabel: 'Fabric length',
    colourLabel: 'Colour',
    imageAlt: 'Product photograph',
  },
  home: {
    metaTitle: 'Ethnic apparel, stitched and unstitched',
    metaDescription:
      'Lawn, cotton and chiffon in stitched and unstitched form. Delivered across Pakistan, cash on delivery available.',
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
    mobilePlaceholder: '03xx xxxxxxx',
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
