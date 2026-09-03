/**
 * SSOT-02 — THE route registry. Internal navigation URLs live here and nowhere
 * else. Backend request paths are a different registry (SSOT-04).
 */
export const ROUTES = {
  home: '/',
  signIn: '/sign-in',
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
