/**
 * D3 — the name of the cookie that holds the mock session.
 *
 * Named once because two readers need the same name: the Server Actions that
 * write and read the session (`actions.ts`), and the end-to-end suite, which
 * signs a customer in by setting this cookie directly so that no test ever types
 * a password (TEST-07). A second copy of the literal in the suite would let the
 * two drift apart silently, and every signed-in journey would then run as a guest
 * (PD-01).
 *
 * A leaf module with no imports, so a Playwright test can read it without
 * pulling in `server-only` code. It goes when §11 replaces D3 with a session
 * Java issues.
 */
export const SESSION_COOKIE = 'session';
