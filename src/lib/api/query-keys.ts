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
    /** §25 is a pure function of these three, so they are the whole key. */
    fabricVerdict: (productId: string, heightCm: number, styleId: string) =>
      [...queryKeys.catalogue.all, 'fabric-verdict', productId, heightCm, styleId] as const,
  },
} as const;
