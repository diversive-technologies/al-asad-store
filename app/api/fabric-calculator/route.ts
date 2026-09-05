import { evaluateFabric } from '@/features/catalogue';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';

/**
 * DATA-08 — the second BFF, and it exists for the same reason as the first:
 * `apiRequest` is `server-only`, and the calculator is driven by a customer
 * typing their height. It proxies and nothing else. The requirement table, the
 * subtraction and the comfort margin all stay in Java (§25).
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own
  // module context or the first request after a hot reload hits a real socket.
  await ensureMockServer();

  const url = new URL(request.url);
  // SEC-02: untrusted input. `Number` yields NaN for junk, which the backend
  // rejects — the frontend does not pre-judge what a valid height is (DATA-13).
  const result = await evaluateFabric({
    productId: url.searchParams.get('productId') ?? '',
    heightCm: Number(url.searchParams.get('heightCm') ?? '0'),
    styleId: url.searchParams.get('styleId') ?? '',
  });

  if (!result.ok) {
    logApiError('api:fabric-calculator', result.error); // ERR-10

    /*
     * Unlike suggestions, there is no safe empty answer here: inventing a
     * verdict would tell a customer their cloth fits. So the failure is a
     * failure, and the panel says it could not check (ERR-11: our copy, not the
     * upstream error text).
     */
    return new Response(null, { status: 502 });
  }

  return Response.json(result.value, { headers: { 'Cache-Control': 'no-store' } });
}
