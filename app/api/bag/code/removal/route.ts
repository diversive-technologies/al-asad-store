import { readCartId, removeCode } from '@/features/bag';
import { getLocale } from '@/i18n';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';

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

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function POST(): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own
  // module context or the first request after a hot reload hits a real socket.
  await ensureMockServer();

  const cartId = await readCartId();
  if (cartId === null) return new Response(null, { status: 404 });

  const result = await removeCode(cartId, await getLocale());

  if (!result.ok) {
    logApiError('api:bag:code:removal', result.error); // ERR-10
    return new Response(null, { status: 502 });
  }

  return Response.json(result.value, { headers: NO_STORE });
}
