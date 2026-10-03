import { checkBackendHealth } from '@/lib/api/health';
import { NO_STORE } from '@/lib/utils/route';

/**
 * F-08 — `GET /api/health`, for an uptime monitor (P-03).
 *
 * `200 {"status":"UP"}` when this storefront can reach Java and Java's database
 * answers; `503 {"status":"DOWN"}` otherwise. It carries no detail on purpose: it
 * is public, and what is wrong is for the logs and the tracker, not for whoever
 * asks. Never cached.
 *
 * A read that changes nothing, so SEC-08's origin check does not apply.
 * CMP-03: Route Handlers require NAMED method exports.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const health = await checkBackendHealth();

  return Response.json(
    { status: health },
    { status: health === 'UP' ? 200 : 503, headers: NO_STORE },
  );
}
