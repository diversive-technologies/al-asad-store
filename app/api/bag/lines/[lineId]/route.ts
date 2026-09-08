import { readCartId, updateQuantity } from '@/features/bag';
import { updateQuantityRequestSchema } from '@/features/bag/contract';
import { getLocale } from '@/i18n';
import type { CartLineId } from '@/lib/domain/ids';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';

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

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

interface RouteContext {
  /** NEXT-03: dynamic params are a Promise in Next.js 16. */
  params: Promise<{ lineId: string }>;
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  await ensureMockServer();

  const cartId = await readCartId();
  if (cartId === null) return new Response(null, { status: 404 });

  const body: unknown = await request.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  const parsed = updateQuantityRequestSchema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });

  const { lineId } = await context.params;
  const result = await updateQuantity(
    cartId,
    lineId as CartLineId,
    parsed.data.quantity,
    await getLocale(),
  );

  if (!result.ok) {
    logApiError('api:bag:patch', result.error); // ERR-10
    return new Response(null, { status: 502 });
  }

  // Raising a quantity runs the same §7.1 transaction as adding, so the union
  // can still come back `UNAVAILABLE` and the panel says which piece ran out.
  return Response.json(result.value, { headers: NO_STORE });
}
