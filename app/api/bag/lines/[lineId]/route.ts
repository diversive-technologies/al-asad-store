import { readCartId, updateQuantity } from '@/features/bag';
import { updateQuantityRequestSchema } from '@/features/bag/contract';
import { getLocale } from '@/i18n';
import { cartLineIdSchema } from '@/lib/domain/ids';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { withMockSession } from '@/lib/mocks/session';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * §16 `updateQuantity(cart, line, qty)`.
 *
 * A write against a line the caller must already hold, so it does not create a
 * cart: without the cookie there is no bag to edit and the answer is 404 rather
 * than a silently created empty one.
 *
 * D6 — removal used to be a DELETE here and is now its own route, at
 * `./removal`. No path in this application destroys anything.
 */
export const dynamic = 'force-dynamic';

interface RouteContext {
  /** NEXT-03: dynamic params are a Promise in Next.js 16. */
  params: Promise<{ lineId: string }>;
}

async function patchHandler(request: Request, context: RouteContext): Promise<Response> {
  await ensureMockServer();

  // SEC-08 — a write, so another origin is refused.
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: NO_STORE });

  // SEC-02 — the path segment is untrusted and goes into a backend path, so it
  // is parsed as the id it claims to be rather than cast to one (TS-03).
  const lineId = cartLineIdSchema.safeParse((await context.params).lineId);
  if (!lineId.success) return new Response(null, { status: 400, headers: NO_STORE });

  const cartId = await readCartId();
  if (cartId === null) return new Response(null, { status: 404, headers: NO_STORE });

  const parsed = updateQuantityRequestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return new Response(null, { status: 400, headers: NO_STORE });

  const result = await updateQuantity(cartId, lineId.data, parsed.data.quantity, await getLocale());

  if (!result.ok) {
    logApiError('api:bag:patch', result.error); // ERR-10
    return new Response(null, { status: 502, headers: NO_STORE });
  }

  // Raising a quantity runs the same §7.1 transaction as adding, so the union
  // can still come back `UNAVAILABLE` and the panel says which piece ran out.
  return Response.json(result.value, { headers: NO_STORE });
}

/*
 * D1 serverless — the cookie is written after the handler has answered, so
 * the rows it carries are the ones this request left behind.
 */
export const PATCH = withMockSession(patchHandler);
