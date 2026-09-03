/**
 * SSOT-04 — THE Java backend endpoint registry. Every backend path is declared
 * once here. Internal navigation URLs are a different registry (SSOT-02) and
 * the two never overlap.
 *
 * Entries are added as modules need them; speculative paths are not declared.
 */
export const ENDPOINTS = {
  content: {
    /** Section 21 ContentQuery.homepage(locale) — locale travels as a header. */
    homepage: '/api/v1/content/homepage',
  },
  catalogue: {
    /**
     * Availability is a separate read from the product projection on purpose:
     * architecture 8.2 keeps stock out of the cached projection so browse
     * traffic does not invalidate the cache on every order.
     */
    availability: '/api/v1/catalogue/availability',
  },
  newsletter: {
    subscribe: '/api/v1/newsletter/subscriptions',
  },
  auth: {
    session: '/api/v1/auth/session',
  },
} as const;
