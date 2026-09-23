import { measurementSubmissionSchema, saveForCustomer } from '@/features/made-to-measure';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { withMockSession } from '@/lib/mocks/session';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * DATA-08 — §34.4 `saveProfile`: a new version when anything changed, never an
 * overwrite.
 *
 * It attaches the one thing the browser must not state for itself — who the
 * profile belongs to — from the session, or from this device's token (A2-5,
 * SEC-01); `saveForCustomer` owns that. Everything else is validated and
 * forwarded.
 */
export const dynamic = 'force-dynamic';

async function postHandler(request: Request): Promise<Response> {
  await ensureMockServer();

  // SEC-08 — a write, so another origin is refused.
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: NO_STORE });

  // SEC-02: untrusted input, validated against the same schema Java is sent.
  const parsed = measurementSubmissionSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return new Response(null, { status: 400, headers: NO_STORE });

  const result = await saveForCustomer(parsed.data);
  if (!result.ok) {
    logApiError('api:made-to-measure:profiles', result.error); // ERR-10
    return new Response(null, { status: 502, headers: NO_STORE });
  }

  /*
   * 200 for both outcomes. `REJECTED` is the rules doing what they are for, and
   * it carries the findings the studio places on the fields.
   */
  return Response.json(result.value, { headers: NO_STORE });
}

/*
 * D1 serverless — a saved set of measurements is recorded in the visitor's
 * own cookie, with the device token it was saved against. Without the token
 * the next instance refuses them with a 401 before looking.
 */
export const POST = withMockSession(postHandler);
