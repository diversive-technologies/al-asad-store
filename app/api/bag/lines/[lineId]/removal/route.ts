import { readCartId, removeItem } from '@/features/bag';
import { getLocale } from '@/i18n';
import { cartLineIdSchema } from '@/lib/domain/ids';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE } from '@/lib/utils/route';

/**
 * §16 `removeItem(cart, line)`.
 *
 * D6 — this is a POST to a `/removal` sub-resource, and it used to be a DELETE
 * on the line itself. The verb changed because the behaviour did: nothing is
 * destroyed anywhere in this system, so a DELETE would have been promising
 * something that does not happen. What this records is that the line was
 * removed; the line stays on file with the reason it left, and only its hold is
 * released.
 *
 * A write against a line the caller must already hold, so it does not create a
 * cart: without the cookie there is no bag to edit and the answer is 404.
 */
export const dynamic = 'force-dynamic';

interface RouteContext {
  /** NEXT-03: dynamic params are a Promise in Next.js 16. */
  params: Promise<{ lineId: string }>;
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own
  // module context or the first request after a hot reload hits a real socket.
  await ensureMockServer();

  // SEC-08 — a write that releases a hold, so another origin is refused.
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: NO_STORE });

  // SEC-02 / TS-03 — parsed as a line id, never cast to one.
  const lineId = cartLineIdSchema.safeParse((await context.params).lineId);
  if (!lineId.success) return new Response(null, { status: 400, headers: NO_STORE });

  const cartId = await readCartId();
  if (cartId === null) return new Response(null, { status: 404, headers: NO_STORE });

  const result = await removeItem(cartId, lineId.data, await getLocale());

  if (!result.ok) {
    logApiError('api:bag:line:removal', result.error); // ERR-10
    return new Response(null, { status: 502, headers: NO_STORE });
  }

  return Response.json(result.value, { headers: NO_STORE });
}
