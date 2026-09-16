import { currentAccountKey } from '@/features/auth/server';
import { removeItems, savedItemsChangeSchema } from '@/features/wishlist';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * D6 — un-hearting RECORDS a removal; it does not destroy anything.
 *
 * Its own path rather than a DELETE on the list, because `DELETE` promises the
 * resource is gone afterwards and that promise would be false here: the row and
 * the date it was saved stay on file. The bag's line and code removals take the
 * same shape.
 *
 * CMP-03: Route Handlers require NAMED method exports.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own context.
  await ensureMockServer();
  // SEC-08 — this writes, so a foreign origin is refused outright.
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const accountKey = await currentAccountKey();
  if (accountKey === null) return new Response(null, { status: 401 });

  // SEC-02 — the body is untrusted input, parsed rather than cast.
  const body = savedItemsChangeSchema.safeParse(await readJsonBody(request));
  if (!body.success) return new Response(null, { status: 400 });

  const saved = await removeItems(accountKey, body.data.productIds);
  if (!saved.ok) {
    logApiError('api:saved-items:removal', saved.error); // ERR-10, once
    // ERR-11 / SEC-07: an authored status, never the upstream error text.
    return new Response(null, { status: 502 });
  }

  return Response.json(saved.value, { headers: NO_STORE });
}
