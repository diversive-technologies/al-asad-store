/**
 * SSOT-07 — THE copy registry. `en` is the shape-defining dictionary; every
 * other locale is typed against `Messages`, so a missing Urdu key is a compile
 * error rather than a blank string in production (I18N-10).
 *
 * I18N-06: each entry is a whole sentence. Fragments that callers would
 * concatenate are PROHIBITED — word order differs between the two languages.
 */
export const en = {
  site: {
    name: 'Al-Asad',
    tagline: 'Ethnic apparel, stitched and unstitched.',
  },
  nav: {
    home: 'Home',
    catalogue: 'Catalogue',
    search: 'Search',
    bag: 'Bag',
    signIn: 'Sign in',
    skipToContent: 'Skip to content',
    primary: 'Primary',
    footer: 'Footer',
  },
  common: {
    switchToUrdu: 'اردو',
    switchToEnglish: 'English',
    languageGroupLabel: 'Language',
    loading: 'Loading…',
    retry: 'Try again',
  },
  foundation: {
    heading: 'Foundation is running',
    body: 'The registries, typed API client, mock layer and bidirectional layout are in place. Storefront modules build on top of this.',
    backendLabel: 'Backend',
    backendReachable: 'Reachable',
    backendVersionLabel: 'Contract version',
    mockLabel: 'Source',
    mockEnabled: 'Mocked at the HTTP boundary',
    mockDisabled: 'Live Java service',
    directionLabel: 'Direction',
    sampleAmountLabel: 'Sample price',
    primaryAction: 'Primary action',
    secondaryAction: 'Secondary action',
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
