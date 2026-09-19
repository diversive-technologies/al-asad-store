import { currentAccountKey } from '@/features/auth/server';
import { fetchSavedSizes, rememberSize, savedSizeChoiceSchema } from '@/features/saved-sizes';
import { getLocale } from '@/i18n';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * DATA-08 — §28.3's saved sizes, for the browser.
 *
 * It exists because a size is remembered from the product page's buy box and
 * read by the card's size tray, both of which run on the client, while
 * `apiRequest` is `server-only`. It proxies and nothing else: the account comes
 * from the SESSION on this side and is attached as a header, so a request can no
 * more name its own owner than an address save can.
 *
 * A GUEST has none. §2.1 gives saved sizes to the Customer and withholds them
 * from the Visitor, so an unauthenticated request is refused rather than served
 * an empty list, which would read as "you have saved nothing".
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

  const sizes = await fetchSavedSizes(accountKey, await getLocale());
  if (!sizes.ok) {
    logApiError('api:saved-sizes', sizes.error); // ERR-10, once, at the boundary
    // ERR-11 / SEC-07: an authored status, never the upstream error text.
    return new Response(null, { status: 502 });
  }

  return Response.json(sizes.value, { headers: NO_STORE });
}

export async function POST(request: Request): Promise<Response> {
  // SEC-08 — this one writes, so a foreign origin is refused before anything else.
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  await ensureMockServer();

  const accountKey = await currentAccountKey();
  if (accountKey === null) return new Response(null, { status: 401 });

  // SEC-02 — the body is untrusted input, parsed rather than cast.
  const body = savedSizeChoiceSchema.safeParse(await readJsonBody(request));
  if (!body.success) return new Response(null, { status: 400 });

  const sizes = await rememberSize(accountKey, body.data.sizeId, await getLocale());
  if (!sizes.ok) {
    logApiError('api:saved-sizes:remember', sizes.error); // ERR-10, once
    /* A size the store does not offer is the one refusal a customer can make
       sense of — the page is older than the catalogue. Everything else is ours. */
    return new Response(null, { status: sizes.error.kind === 'NOT_FOUND' ? 404 : 502 });
  }

  return Response.json(sizes.value, { headers: NO_STORE });
}
