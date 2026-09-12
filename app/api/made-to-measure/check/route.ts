import { checkMeasurements, measurementSubmissionSchema } from '@/features/made-to-measure';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * DATA-08 — §34.4 `validate`, for the studio's review before a save.
 *
 * It stores nothing. It answers what WOULD be recorded and what stands in the
 * way, so the review shows the server's millimetres rather than the browser's own
 * arithmetic (A2-2). It validates the shape and forwards; every rule is Java's.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own mocks.
  await ensureMockServer();

  // SEC-08 — like every write this studio makes, refused from another origin.
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: NO_STORE });

  // SEC-02: untrusted input, validated against the same schema Java is sent.
  const parsed = measurementSubmissionSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return new Response(null, { status: 400, headers: NO_STORE });

  const result = await checkMeasurements(parsed.data);
  if (!result.ok) {
    logApiError('api:made-to-measure:check', result.error); // ERR-10
    return new Response(null, { status: 502, headers: NO_STORE });
  }

  return Response.json(result.value, { headers: NO_STORE });
}
