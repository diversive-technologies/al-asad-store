/**
 * D1 — THE fixture source for the mock layer.
 *
 * These records stand in for the Java service while it is being built. They are
 * shaped to satisfy the same Zod schemas the real responses must satisfy, so a
 * fixture that drifts from the contract fails at the boundary (DATA-02) exactly
 * as a non-conforming backend response would.
 *
 * DATA-13: fixtures report constraints, they do not compute them. Availability,
 * pricing and promotion outcomes are stated here as the backend would state
 * them — never derived in the handler.
 */
export const SYSTEM_HEALTH = {
  status: 'ok',
  version: '0.1.0-mock',
} as const;
