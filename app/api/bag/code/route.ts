import { applyCode, readCartId } from '@/features/bag';
import { applyCodeRequestSchema } from '@/features/bag/contract';
import { getLocale } from '@/i18n';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { withMockSession } from '@/lib/mocks/session';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * §16 `applyCode(cart, code)`. D6 — lifting it is its own route, at `./removal`.
 *
 * DATA-13: whether a code exists, what it is worth and why it was refused are
 * all Pricing's answers. This route forwards a string and renders back whatever
 * it is told — it does not know a single code, and must not learn one.
 */
export const dynamic = 'force-dynamic';

async function postHandler(request: Request): Promise<Response> {
  await ensureMockServer();

  // SEC-08 — a write, so another origin is refused.
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: NO_STORE });

  const cartId = await readCartId();
  if (cartId === null) return new Response(null, { status: 404, headers: NO_STORE });

  const parsed = applyCodeRequestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return new Response(null, { status: 400, headers: NO_STORE });

  const result = await applyCode(cartId, parsed.data.code, await getLocale());

  if (!result.ok) {
    logApiError('api:bag:code:post', result.error); // ERR-10
    return new Response(null, { status: 502, headers: NO_STORE });
  }

  // A refused code is a 200 carrying `REJECTED`, for the same reason
  // `Unavailable` is: it is an answer, not a failed request.
  return Response.json(result.value, { headers: NO_STORE });
}

/*
 * D1 serverless — the cookie is written after the handler has answered, so
 * the rows it carries are the ones this request left behind.
 */
export const POST = withMockSession(postHandler);
