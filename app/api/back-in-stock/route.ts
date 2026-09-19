import { currentAccountKey } from '@/features/auth/server';
import {
  backInStockFailureStatus,
  backInStockRequestSchema,
  requestBackInStock,
} from '@/features/back-in-stock';
import { getLocale } from '@/i18n';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * DATA-08 — §28.2's Notify Me, for the browser.
 *
 * It exists because the press happens in the BROWSER and `apiRequest` is
 * `server-only`. It proxies and nothing else: the account comes from the SESSION
 * on this side and is attached as a header, so a request can never name an
 * account to be written to. A guest is served too — Notify Me does not need an
 * account, only an address — and whose address is used is the backend's rule.
 *
 * CMP-03: Route Handlers require NAMED method exports.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own context.
  await ensureMockServer();
  // SEC-08 — this records something against an address, so a foreign origin is refused first.
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: NO_STORE });

  // SEC-02 — the body is untrusted input, parsed against the contract rather than cast.
  const body = backInStockRequestSchema.safeParse(await readJsonBody(request));
  if (!body.success) return new Response(null, { status: 400, headers: NO_STORE });

  const [accountKey, locale] = await Promise.all([currentAccountKey(), getLocale()]); // PERF-02
  const answer = await requestBackInStock(body.data, { accountKey, locale });

  if (!answer.ok) {
    // A refused address goes back on the field; an unknown size means a stale page.
    const status = backInStockFailureStatus(answer.error);
    if (status === 502) logApiError('api:back-in-stock', answer.error); // ERR-10, at the boundary

    // ERR-11 / SEC-07: an authored status, never the upstream error text.
    return new Response(null, { status, headers: NO_STORE });
  }

  return Response.json(answer.value, { headers: NO_STORE });
}
