import { currentAccountKey } from '@/features/auth/server';
import { readOrderFor } from '@/features/checkout';
import { orderNumberSchema } from '@/lib/domain/ids';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';
import { NO_STORE } from '@/lib/utils/route';

/**
 * DATA-08 — reading one order, and the EIGHTH BFF in the project.
 *
 * ## Why this route exists at all
 *
 * `/order/[orderNumber]` used to read the order during its own server render,
 * which is the obvious thing to do and is wrong here. Under D1 the "backend" is
 * MSW answering from Maps held in the Node process, and a serverless platform
 * does not give a page render and a Route Handler the same process: the order
 * was written to `ORDERS` by `POST /api/checkout/place` and read back by a
 * function whose `ORDERS` had never been written to. Every placement ended on a
 * 404, deterministically, on the deployment and never once locally — where a
 * single long-lived `next dev` process hides the whole problem.
 *
 * So the rule this route restores is: MUTABLE state under D1 is reached from
 * Route Handlers only, never from a Server Component render. The bag already
 * worked precisely because it obeys that — `/bag` renders a Client Component
 * that fetches `/api/bag`. This is the order doing the same thing.
 *
 * ## Who may read it (§28.3)
 *
 * The NUMBER is an address and never a secret — numbers run in sequence. So the
 * route attaches who is asking: the session's account, and any access token this
 * browser holds for the order. The backend decides; anyone it does not recognise
 * gets the same 404 an unknown number does, and the page then asks for the
 * order's mobile number (`./lookup`).
 *
 * A read, and it changes nothing, so SEC-08's origin check does not apply.
 */
export const dynamic = 'force-dynamic';

interface RouteContext {
  /** NEXT-03: dynamic params are a Promise in Next.js 16. */
  params: Promise<{ orderNumber: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own
  // module context or the first request after a hot reload hits a real socket.
  await ensureMockServer();

  /*
   * SEC-02 — the path segment is untrusted and goes into a backend path. It is
   * parsed as an order number, which declines anything that is not one path
   * segment; the FORMAT of a number stays the backend's rule (DATA-13).
   */
  const orderNumber = orderNumberSchema.safeParse((await context.params).orderNumber);
  if (!orderNumber.success) return new Response(null, { status: 404, headers: NO_STORE });

  const result = await readOrderFor(orderNumber.data, await currentAccountKey());

  if (!result.ok) {
    /*
     * ERR-02 — a number this browser may not see is an ordinary business state
     * and answers 404. Anything else is the store being unreachable, and MUST NOT
     * be dressed up as one: saying "no such order" to someone holding a receipt
     * sends them looking for a mistake they did not make.
     */
    if (result.error.kind === 'NOT_FOUND') {
      return new Response(null, { status: 404, headers: NO_STORE });
    }

    logApiError('api:checkout:order', result.error); // ERR-10
    return new Response(null, { status: 502, headers: NO_STORE });
  }

  return Response.json(result.value, { headers: NO_STORE });
}
