import { addressChoiceSchema, chooseDefaultAddress } from '@/features/addresses';
import { currentAccountKey } from '@/features/auth/server';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { withMockSession } from '@/lib/mocks/session';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * Which address checkout offers first.
 *
 * Its own path, because choosing a default is an event about the BOOK rather
 * than an edit to one address: the address itself is unchanged, and posting it
 * back through the write path would append a version recording nothing.
 *
 * CMP-03: Route Handlers require NAMED method exports.
 */
export const dynamic = 'force-dynamic';

async function postHandler(request: Request): Promise<Response> {
  await ensureMockServer();
  // SEC-08 — a write, so a foreign origin is refused outright.
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const accountKey = await currentAccountKey();
  if (accountKey === null) return new Response(null, { status: 401 });

  // SEC-02 — the body is untrusted input, parsed rather than cast.
  const body = addressChoiceSchema.safeParse(await readJsonBody(request));
  if (!body.success) return new Response(null, { status: 400 });

  const book = await chooseDefaultAddress(accountKey, body.data.addressId);
  if (!book.ok) {
    logApiError('api:addresses:default', book.error); // ERR-10, once
    return new Response(null, { status: book.error.kind === 'NOT_FOUND' ? 404 : 502 });
  }

  return Response.json(book.value, { headers: NO_STORE });
}

/*
 * D1 serverless — §28.3's rows belong to the account and are recorded in
 * the visitor's own cookie, so the next instance can still answer with them.
 */
export const POST = withMockSession(postHandler);
