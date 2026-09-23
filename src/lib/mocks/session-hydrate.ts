import 'server-only';

import { activeRestore } from './node';
import { readMockSession } from './session-cookie';
import { restoreMockSession } from './session-snapshot';

/**
 * D1 — putting a visitor's rows back before anything reads them.
 *
 * Its own module, rather than a function in `session.ts`, for one reason:
 * `node.ts` brings in `msw/node`, and every mutating Route Handler imports
 * `session.ts` for the wrapper. Joining the two would trace msw into every one
 * of those bundles, which IMP-01a exists to prevent. `ensure.ts` reaches this
 * file behind the same dynamic import that already guards the mock layer, so
 * nothing statically depends on msw that should not.
 */

/**
 * Fill the SERVING stores from the visitor's cookie.
 *
 * Safe to call on every request. `restoreMockSession` does not overwrite a
 * cart the instance already holds, so a warm instance pays a parse and nothing
 * else, and the rows already there — fresher than the cookie's — stand.
 *
 * The restore comes from the ARMED server rather than this file's own import,
 * because the two are not always the same stores. Next evaluates the mock
 * layer once per layer, so a restore into the context that merely read the
 * cookie is invisible to the handlers answering the request. That is measured,
 * not theoretical: with a plain import, a cold instance served the restored
 * line from `/api/bag` while `/bag` rendered "Your bag is empty".
 */
export async function hydrateMockSession(): Promise<void> {
  const session = await readMockSession();

  (activeRestore() ?? restoreMockSession)(session);
}
