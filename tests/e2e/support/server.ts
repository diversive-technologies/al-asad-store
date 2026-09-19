/**
 * Where the end-to-end suite's own dev server listens (TEST-07).
 *
 * Named once, because two places need it: `playwright.config.ts` starts the
 * server here, and the specs build absolute addresses from it — the URL a cookie
 * is set for, the link "Copy link" is expected to copy (PD-01).
 *
 * 3107 rather than 3000. Port 3000 is where a developer's own `npm run dev`
 * runs, and the suite must never find that server and test it by mistake: its
 * in-memory carts, orders and profiles are whatever the developer did to them,
 * so every journey would start from somebody else's state.
 *
 * The two cannot run at once, though: Next allows one `next dev` per project
 * directory, so stop your own before `npm run test:e2e` (`playwright.config.ts`
 * has the reasoning).
 */
export const E2E_PORT = 3107;

export const E2E_BASE_URL = `http://localhost:${String(E2E_PORT)}`;

/**
 * How long a journey waits to ARRIVE somewhere — a new address, a page's first
 * heading, the answer to a first request. A route's first request in `next dev`
 * compiles it, which can outlast an assertion's ordinary wait; `global-setup.ts`
 * compiles every route before the first journey, so this is the margin for a
 * slow machine rather than the expected wait. What a page then SAYS is still
 * held to the ordinary timeout.
 */
export const ARRIVAL = { timeout: 60_000 } as const;
