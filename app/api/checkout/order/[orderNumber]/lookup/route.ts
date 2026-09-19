import { lookUpOrderFor } from '@/features/checkout';
import { orderLookupRequestSchema } from '@/features/checkout/contract';
import { orderNumberSchema } from '@/lib/domain/ids';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * DATA-08 — §28.3's guest lookup "by number and mobile".
 *
 * A POST, so the mobile number travels in a body and never in an address. The
 * BACKEND compares it with the order's; this route never sees the order's own
 * mobile before the backend has matched it. A match keeps a fresh access token in
 * this browser's httpOnly cookie, so the order opens again without asking twice.
 *
 * A wrong mobile and a number that names nothing are the same 404, so the lookup
 * cannot be used to learn which numbers exist.
 */
export const dynamic = 'force-dynamic';

interface RouteContext {
  /** NEXT-03: dynamic params are a Promise in Next.js 16. */
  params: Promise<{ orderNumber: string }>;
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  await ensureMockServer();

  // SEC-08 — a write: it issues and keeps a capability, so another origin is refused.
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: NO_STORE });

  // SEC-02 — the segment goes into a backend path; the body is untrusted too.
  const orderNumber = orderNumberSchema.safeParse((await context.params).orderNumber);
  if (!orderNumber.success) return new Response(null, { status: 404, headers: NO_STORE });

  const parsed = orderLookupRequestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return new Response(null, { status: 400, headers: NO_STORE });

  const result = await lookUpOrderFor(orderNumber.data, parsed.data);

  if (!result.ok) {
    if (result.error.kind === 'NOT_FOUND') {
      return new Response(null, { status: 404, headers: NO_STORE });
    }

    logApiError('api:checkout:order:lookup', result.error); // ERR-10
    return new Response(null, { status: 502, headers: NO_STORE });
  }

  return Response.json(result.value, { headers: NO_STORE });
}
