import { clientAddressHeader } from '@/lib/api/client-address';
import {
  CLIENT_ERROR_LIMIT_PER_MINUTE,
  CLIENT_ERROR_MAX_BYTES,
  parseClientError,
  WindowLimiter,
} from '@/lib/observability/client-error-report';
import { captureClientError } from '@/lib/observability/error-tracking';
import { declaredLength, NO_STORE } from '@/lib/utils/route';
import { isSameOrigin } from '@/lib/utils/request';

/**
 * F-08 — where the browser's error boundaries report an error (TD-11: no tracker
 * code ships to the browser, so the tracker is reached through the server).
 *
 * Public, so nothing in it is trusted: the body is capped at 2 kB, parsed against
 * a schema and cut down to a message, a digest and a pathname; at most five
 * reports a minute are taken per client address. It ANSWERS 204 to every request
 * that gets past the origin check — accepted, malformed, oversized or over the
 * limit — because the page that sent it can do nothing with a refusal and must not
 * be able to tell which of those it was.
 *
 * SEC-08: a write, so another origin is refused first.
 * CMP-03: Route Handlers require NAMED method exports.
 */
export const dynamic = 'force-dynamic';

const limiter = new WindowLimiter(CLIENT_ERROR_LIMIT_PER_MINUTE, 60_000);

const ACCEPTED = (): Response => new Response(null, { status: 204, headers: NO_STORE });

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: NO_STORE });

  // Refused before any of it is read: a declared length over the cap is not a report.
  const declared = declaredLength(request);
  if (declared !== null && declared > CLIENT_ERROR_MAX_BYTES) return ACCEPTED();

  const address = clientAddressHeader(request)['x-client-ip'] ?? 'unknown';
  if (!limiter.allow(address, Date.now())) return ACCEPTED();

  // ERR-05(1): reading the body can reject; it becomes an empty one.
  const body = await request.text().then(
    (text) => text,
    () => '',
  );
  const report = parseClientError(body);
  if (report !== null) captureClientError(report);

  return ACCEPTED();
}
