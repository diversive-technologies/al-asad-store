import { readCartId, removeCode } from '@/features/bag';
import { getLocale } from '@/i18n';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { withMockSession } from '@/lib/mocks/session';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE } from '@/lib/utils/route';

/**
 * §16 — lifting the promotional code on the bag.
 *
 * D6 — a POST that RECORDS the lift, where this used to be a DELETE on the
 * code. The code stops applying and the cart's history keeps it, so which codes
 * a customer tried and in what order is answerable later (§26).
 *
 * DATA-13 still holds throughout: what a code is worth and whether it applies
 * are Pricing's answers. This route forwards and renders back what it is told.
 */
export const dynamic = 'force-dynamic';

async function postHandler(request: Request): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own
  // module context or the first request after a hot reload hits a real socket.
  await ensureMockServer();

  // SEC-08 — a write, so another origin is refused.
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: NO_STORE });

  const cartId = await readCartId();
  if (cartId === null) return new Response(null, { status: 404, headers: NO_STORE });

  const result = await removeCode(cartId, await getLocale());

  if (!result.ok) {
    logApiError('api:bag:code:removal', result.error); // ERR-10
    return new Response(null, { status: 502, headers: NO_STORE });
  }

  return Response.json(result.value, { headers: NO_STORE });
}

/*
 * D1 serverless — the cookie is written after the handler has answered, so
 * the rows it carries are the ones this request left behind.
 */
export const POST = withMockSession(postHandler);
