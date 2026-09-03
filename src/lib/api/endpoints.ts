/**
 * SSOT-04 — THE Java backend endpoint registry. Every backend path is declared
 * once here. Internal navigation URLs are a different registry (SSOT-02) and
 * the two never overlap.
 *
 * Entries are added as modules need them; speculative paths are not declared.
 */
export const ENDPOINTS = {
  system: {
    health: '/api/v1/health',
  },
} as const;
