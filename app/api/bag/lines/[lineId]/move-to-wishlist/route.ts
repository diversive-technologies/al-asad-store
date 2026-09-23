import { currentAccountKey } from '@/features/auth/server';
import { moveToWishlist, readCartId } from '@/features/bag';
import { getLocale } from '@/i18n';
import { cartLineIdSchema } from '@/lib/domain/ids';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { withMockSession } from '@/lib/mocks/session';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE } from '@/lib/utils/route';

/**
 * §16 `moveToWishlist(cart, line)`.
 *
 * DATA-08 — it attaches TWO credentials and decides nothing: the cart from the
 * httpOnly cookie, and the account from the SESSION, sent as the header the saved
 * items travel under. Neither can be named by the browser, so a request can move a
 * line only out of its own bag and only into its own customer's list.
 *
 * A GUEST is refused with 401 before the cart is read. Saved items belong to an
 * account (§28.3), and a line moved "into" nobody's list would simply be a line
 * removed from the bag under a different name.
 *
 * CMP-03: Route Handlers require NAMED method exports.
 */
export const dynamic = 'force-dynamic';

interface RouteContext {
  /** NEXT-03: dynamic params are a Promise in Next.js 16. */
  params: Promise<{ lineId: string }>;
}

async function postHandler(request: Request, context: RouteContext): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own context.
  await ensureMockServer();

  // SEC-08 — a write that releases a hold and changes a saved list.
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: NO_STORE });

  const accountKey = await currentAccountKey();
  if (accountKey === null) return new Response(null, { status: 401, headers: NO_STORE });

  // SEC-02 / TS-03 — parsed as a line id, never cast to one: it goes into a path.
  const lineId = cartLineIdSchema.safeParse((await context.params).lineId);
  if (!lineId.success) return new Response(null, { status: 400, headers: NO_STORE });

  const cartId = await readCartId();
  if (cartId === null) return new Response(null, { status: 404, headers: NO_STORE });

  const result = await moveToWishlist(cartId, lineId.data, accountKey, await getLocale());

  if (!result.ok) {
    logApiError('api:bag:line:move-to-wishlist', result.error); // ERR-10, once
    // ERR-11 / SEC-07: an authored status, never the upstream error text.
    return new Response(null, { status: 502, headers: NO_STORE });
  }

  // Every answer is a value in the union, the refusal of a made-to-measure line included.
  return Response.json(result.value, { headers: NO_STORE });
}

/*
 * D1 serverless — the cookie is written after the handler has answered, so
 * the rows it carries are the ones this request left behind.
 */
export const POST = withMockSession(postHandler);
