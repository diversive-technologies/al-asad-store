import 'server-only';

import {
  cartIdFromResponse,
  mockSessionCookies,
  readCartIdForSession,
  readMockSession,
} from './session-cookie';
import { captureMockSession, carryOrders } from './session-snapshot';

/**
 * D1 — the two halves of carrying mock state across serverless invocations.
 *
 * `session-snapshot.ts` says why this is needed and what travels;
 * `session-cookie.ts` is the codec. This file is only the ORDER of operations,
 * and there are exactly two:
 *
 * - **Restore before anything reads**, which is `session-hydrate.ts`. It is a
 *   module of its own because it reaches into `node.ts` for the armed server,
 *   and `node.ts` pulls in `msw/node`: every Route Handler imports THIS file,
 *   and IMP-01a keeps msw out of a bundle that has no business resolving it.
 * - **Record after anything writes.** Only a Route Handler may set a cookie in
 *   Next, and every mutation in this storefront is a Route Handler, so
 *   `withMockSession` wraps those and nothing else. A page render has nothing
 *   to record: it only reads.
 */

/**
 * The `Set-Cookie` values recording what this request left behind.
 *
 * The orders already in the cookie are carried across: a snapshot can only
 * reach the order its CURRENT cart became, and that cart is replaced the first
 * time the customer adds something after checking out.
 *
 * The cart id is taken from the RESPONSE first. On the first add of a visit
 * the handler mints the cart mid-request, so the id is not among the cookies
 * the browser sent and only the response knows it yet.
 */
async function sessionCookiesFor(response: Response): Promise<string[]> {
  const cartId = cartIdFromResponse(response) ?? (await readCartIdForSession());
  const previous = await readMockSession();

  return mockSessionCookies(carryOrders(previous, captureMockSession(cartId)));
}

/**
 * A mutating Route Handler that records what it changed.
 *
 * Applied at the export — `export const POST = withMockSession(handler)` — so
 * a handler keeps its own shape and every early return is covered. Wrapping is
 * the whole reason this is a higher-order function rather than a call at the
 * end of each handler: several of these routes refuse in four or five places,
 * and a `persist` before each `return` is a line that WILL be missed when one
 * more refusal is added.
 *
 * The response is produced first and the cookie written after, because the
 * snapshot has to describe the store as the handler left it. That ordering is
 * why the header goes onto the RESPONSE rather than through `cookies()`: Next
 * ignores a cookie set once the handler has returned one, so the session
 * cookie never reached the browser until it was appended here. The response is
 * rebuilt rather than mutated because its headers are sealed.
 */
export function withMockSession<Args extends readonly unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<Response>,
): (request: Request, ...args: Args) => Promise<Response> {
  return async (request: Request, ...args: Args): Promise<Response> => {
    const response = await handler(request, ...args);
    const headers = new Headers(response.headers);

    for (const cookie of await sessionCookiesFor(response)) {
      headers.append('set-cookie', cookie);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
