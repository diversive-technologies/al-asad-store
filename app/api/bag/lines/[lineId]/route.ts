import { readCartId, removeItem, updateQuantity } from '@/features/bag';
import { updateQuantityRequestSchema } from '@/features/bag/contract';
import { getLocale } from '@/i18n';
import type { CartLineId } from '@/lib/domain/ids';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';

/**
 * §16 `updateQuantity(cart, line, qty)` and `removeItem(cart, line)`.
 *
 * Both are writes against a line the caller must already hold, so neither
 * creates a cart: without the cookie there is no bag to edit and the answer is
 * 404 rather than a silently created empty one.
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

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  await ensureMockServer();

  const cartId = await readCartId();
  if (cartId === null) return new Response(null, { status: 404 });

  const { lineId } = await context.params;
  const result = await removeItem(cartId, lineId as CartLineId, await getLocale());

  if (!result.ok) {
    logApiError('api:bag:delete', result.error);
    return new Response(null, { status: 502 });
  }

  return Response.json(result.value, { headers: NO_STORE });
}
