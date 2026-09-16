import { addressChoiceSchema, removeAddress } from '@/features/addresses';
import { currentAccountKey } from '@/features/auth/server';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * D6 — a removal is RECORDED at its own path, never a DELETE on the address.
 *
 * The address and the date it was removed stay on file, because an order
 * delivered to it happened and "removed from my book" and "never existed" are
 * different things.
 *
 * CMP-03: Route Handlers require NAMED method exports.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  await ensureMockServer();
  // SEC-08 — a write, so a foreign origin is refused outright.
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const accountKey = await currentAccountKey();
  if (accountKey === null) return new Response(null, { status: 401 });

  // SEC-02 — the body is untrusted input, parsed rather than cast.
  const body = addressChoiceSchema.safeParse(await readJsonBody(request));
  if (!body.success) return new Response(null, { status: 400 });

  const book = await removeAddress(accountKey, body.data.addressId);
  if (!book.ok) {
    logApiError('api:addresses:removal', book.error); // ERR-10, once
    /* An address this account no longer holds is the one failure the customer
       can make sense of: the page was opened before it went. */
    return new Response(null, { status: book.error.kind === 'NOT_FOUND' ? 404 : 502 });
  }

  return Response.json(book.value, { headers: NO_STORE });
}
