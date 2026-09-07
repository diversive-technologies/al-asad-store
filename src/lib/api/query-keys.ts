/**
 * SSOT-06 — THE query-key registry. Inline TanStack Query keys silently break
 * invalidation at scale and are PROHIBITED.
 *
 * Filters are typed structurally, not with a feature type: `lib/` MUST NOT
 * import from `features/` (MOD-01).
 */
type QueryFilters = Readonly<Record<string, unknown>>;

export const queryKeys = {
  system: {
    all: ['system'] as const,
    health: () => [...queryKeys.system.all, 'health'] as const,
  },
  catalogue: {
    all: ['catalogue'] as const,
    lists: () => [...queryKeys.catalogue.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.catalogue.lists(), filters] as const,
    details: () => [...queryKeys.catalogue.all, 'detail'] as const,
    detail: (slug: string) => [...queryKeys.catalogue.details(), slug] as const,
    /**
     * Keyed by term AND locale: the same partial word suggests different
     * products in each language, and one cache entry for both would serve Urdu
     * results into an English box.
     */
    suggestions: (term: string, locale: string) =>
      [...queryKeys.catalogue.all, 'suggestions', locale, term] as const,
    /** §28.2's card quick add: the sizes one product may be added in. */
    quickAdd: (slug: string) => [...queryKeys.catalogue.all, 'quick-add', slug] as const,
    /** §25 is a pure function of these three, so they are the whole key. */
    fabricVerdict: (productId: string, heightCm: number, styleId: string) =>
      [...queryKeys.catalogue.all, 'fabric-verdict', productId, heightCm, styleId] as const,
  },
  /**
   * §28.3's saved items.
   *
   * Keyed by the ids AND the locale: the list changes when something is saved
   * or removed, and the same products carry different fabric and colour names
   * in each language. The ids are joined rather than passed as an array so that
   * the same set always produces the same key.
   */
  wishlist: {
    all: ['wishlist'] as const,
    products: (ids: readonly string[], locale: string) =>
      [...queryKeys.wishlist.all, locale, ids.join(',')] as const,
  },
  /**
   * §16 — the bag is ONE server-owned object, so it is one key.
   *
   * Deliberately not keyed by cart id: the id lives in an httpOnly cookie the
   * client cannot read, and every mutation returns the refreshed summary, so
   * there is exactly one bag per browser and one cache entry for it.
   */
  bag: {
    all: ['bag'] as const,
    summary: () => [...queryKeys.bag.all, 'summary'] as const,
  },
  /**
   * §17 — the quote depends on the delivery option and whether it is a gift,
   * because both change the total, and the total is what decides whether Cash
   * on Delivery is offered at all. Those two are therefore part of the key.
   */
  checkout: {
    all: ['checkout'] as const,
    quote: (deliveryOptionId: string, isGift: boolean) =>
      [...queryKeys.checkout.all, 'quote', deliveryOptionId, isGift] as const,
  },
} as const;
