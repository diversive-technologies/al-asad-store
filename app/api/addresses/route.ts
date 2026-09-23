import { currentAccountKey } from '@/features/auth/server';
import { addressWriteSchema, fetchAddresses, writeAddress } from '@/features/addresses';
import type { ApiError } from '@/lib/api/errors';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { withMockSession } from '@/lib/mocks/session';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * DATA-08 — §28.3's address book, for the browser.
 *
 * It exists because the book is read and written from a FORM and a picker, both
 * of which run on the client, while `apiRequest` is `server-only`. It proxies
 * and nothing else: the account comes from the SESSION on this side and is
 * attached as a header, so a request can no more name its own owner than a
 * measurement save can.
 *
 * A GUEST has no book. §2.1 gives saved addresses to the Customer and withholds
 * them from the Visitor, and a guest checks out by typing one (§28.2) — so an
 * unauthenticated request is refused rather than served an empty list, which
 * would read as "you have saved nothing".
 *
 * CMP-03: Route Handlers require NAMED method exports.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own
  // module context or the first request after a hot reload hits a real socket.
  await ensureMockServer();
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const accountKey = await currentAccountKey();
  if (accountKey === null) return new Response(null, { status: 401 });

  const book = await fetchAddresses(accountKey);
  if (!book.ok) {
    logApiError('api:addresses', book.error); // ERR-10, once, at the boundary
    // ERR-11 / SEC-07: an authored status, never the upstream error text.
    return new Response(null, { status: 502 });
  }

  return Response.json(book.value, { headers: NO_STORE });
}

async function postHandler(request: Request): Promise<Response> {
  await ensureMockServer();
  // SEC-08 — this one writes, so a foreign origin is refused outright.
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const accountKey = await currentAccountKey();
  if (accountKey === null) return new Response(null, { status: 401 });

  // SEC-02 — the body is untrusted input, parsed rather than cast.
  const body = addressWriteSchema.safeParse(await readJsonBody(request));
  if (!body.success) return new Response(null, { status: 400 });

  const book = await writeAddress(accountKey, body.data.address, body.data.addressId);
  if (!book.ok) {
    logApiError('api:addresses:write', book.error);
    /*
     * The upstream status is PASSED ON for the two the customer can act on: a
     * book that is full, and an address this account no longer holds. Every
     * other failure is ours to report as one (ERR-11).
     */
    return new Response(null, { status: statusFor(book.error) });
  }

  return Response.json(book.value, { headers: NO_STORE });
}

/**
 * 409 the book is full, 404 the address is no longer held, 502 anything else.
 *
 * Only the two a CUSTOMER can act on are passed through — one says to remove an
 * address before adding another, the other that the page is looking at
 * something that has since gone. Everything else is a fault of ours and is
 * reported as one, never as a status the interface might dress up as advice.
 */
function statusFor(error: ApiError): number {
  if (error.kind === 'CONFLICT') return 409;
  if (error.kind === 'NOT_FOUND') return 404;
  return 502;
}

/*
 * D1 serverless — §28.3's rows belong to the account and are recorded in
 * the visitor's own cookie, so the next instance can still answer with them.
 */
export const POST = withMockSession(postHandler);
