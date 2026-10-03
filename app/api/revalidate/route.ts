import { serverEnv } from '@/config/env.server';
import { clientAddressHeader } from '@/lib/api/client-address';
import {
  REVALIDATE_FAILED_LIMIT_PER_MINUTE,
  REVALIDATE_MAX_BYTES,
  REVALIDATE_SECRET_HEADER,
  revalidateBodySchema,
  secretMatches,
} from '@/lib/api/revalidate-request';
import { WindowLimiter } from '@/lib/observability/client-error-report';
import { declaredLength, NO_STORE, readJsonBody } from '@/lib/utils/route';
import { revalidateTag } from 'next/cache';

/**
 * F-06 — `POST /api/revalidate`, called by the Java worker (never by a browser)
 * after an import changed something, so a withdrawn product stops being served
 * from the cache within the request rather than within the revalidation window.
 *
 *   header  x-revalidate-secret: <REVALIDATE_SECRET>
 *   body    { "tags": ["catalogue", "content", ...] }
 *   answers 204 done · 400 body not understood · 401 secret wrong or missing
 *           · 413 body over 1 kB · 429 too many wrong secrets from one address
 *
 * EXEMPT from SEC-08's same-origin check, deliberately: the caller is a server,
 * which sends no `Origin`, and the shared secret — not the origin — is what
 * authorises the call (see request-policy.test.ts). The secret is checked FIRST,
 * before the body is read, and a refusal carries no body, so nothing says whether
 * the secret was absent, short or nearly right. With `REVALIDATE_SECRET` unset
 * no secret can match, so the route is closed.
 *
 * Expiry is `{ expire: 0 }`: stale content is never served after the call, which
 * is the point — a withdrawn product must not show once more.
 *
 * CMP-03: Route Handlers require NAMED method exports.
 */
export const dynamic = 'force-dynamic';

/** Wrong-secret attempts only: the backend's own calls are never counted. */
const failedAttempts = new WindowLimiter(REVALIDATE_FAILED_LIMIT_PER_MINUTE, 60_000);

const respond = (status: number, headers: Record<string, string> = {}): Response =>
  new Response(null, { status, headers: { ...NO_STORE, ...headers } });

export async function POST(request: Request): Promise<Response> {
  if (!secretMatches(serverEnv.REVALIDATE_SECRET, request.headers.get(REVALIDATE_SECRET_HEADER))) {
    const address = clientAddressHeader(request)['x-client-ip'] ?? 'unknown';
    // Only a wrong secret is counted, so the backend's good calls never meet the limit.
    return failedAttempts.allow(address, Date.now())
      ? respond(401)
      : respond(429, { 'Retry-After': '60' });
  }

  const declared = declaredLength(request);
  if (declared !== null && declared > REVALIDATE_MAX_BYTES) return respond(413);

  const parsed = revalidateBodySchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return respond(400);

  for (const tag of new Set(parsed.data.tags)) revalidateTag(tag, { expire: 0 });

  return respond(204);
}
