import { currentAccountKey } from '@/features/auth/server';
import { fetchSavedItems, saveItems, savedItemsChangeSchema } from '@/features/wishlist';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { withMockSession } from '@/lib/mocks/session';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * DATA-08 — §28.3's saved items, for the browser.
 *
 * It exists because the heart is pressed in the BROWSER and `apiRequest` is
 * `server-only`. It proxies and nothing else: the account comes from the SESSION
 * on this side and is attached as a header, so a request can no more name its own
 * owner than a measurement save can.
 *
 * A GUEST has no list here. Their saved items stay in their own browser — there
 * is no account for them to belong to — so an unauthenticated request is refused
 * rather than served an empty list, which would read as "you have saved nothing".
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

  const saved = await fetchSavedItems(accountKey);
  if (!saved.ok) {
    logApiError('api:saved-items', saved.error); // ERR-10, once, at the boundary
    // ERR-11 / SEC-07: an authored status, never the upstream error text.
    return new Response(null, { status: 502 });
  }

  return Response.json(saved.value, { headers: NO_STORE });
}

async function postHandler(request: Request): Promise<Response> {
  await ensureMockServer();
  // SEC-08 — this one writes, so a foreign origin is refused outright.
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const accountKey = await currentAccountKey();
  if (accountKey === null) return new Response(null, { status: 401 });

  // SEC-02 — the body is untrusted input, parsed rather than cast.
  const body = savedItemsChangeSchema.safeParse(await readJsonBody(request));
  if (!body.success) return new Response(null, { status: 400 });

  const saved = await saveItems(accountKey, body.data.productIds);
  if (!saved.ok) {
    logApiError('api:saved-items:save', saved.error);
    return new Response(null, { status: 502 });
  }

  return Response.json(saved.value, { headers: NO_STORE });
}

/*
 * D1 serverless — §28.3's rows belong to the account and are recorded in
 * the visitor's own cookie, so the next instance can still answer with them.
 */
export const POST = withMockSession(postHandler);
