/**
 * SSOT-02 — THE route registry. Internal navigation URLs live here and nowhere
 * else. Backend request paths are a different registry (SSOT-04) and the two
 * never overlap.
 */
export const ROUTES = {
  home: '/',
  signIn: '/sign-in',
  catalogue: {
    list: '/catalogue',
    detail: (slug: string) => `/catalogue/${slug}`,
  },
  bag: '/bag',
  checkout: '/checkout',
  search: '/search',
  help: {
    fabricGlossary: '/help/fabric-glossary',
    paymentGuide: '/help/payment-guide',
    sizeGuide: '/help/size-guide',
    careGuide: '/help/care-guide',
  },
} as const;
