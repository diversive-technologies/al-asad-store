import { fetchOrder } from '@/features/checkout';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';

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
 * It is a legitimate BFF rather than scaffolding: `apiRequest` is `server-only`
 * and the read has to start in the browser. When Java replaces the mock layer
 * the route stays exactly as it is, because the reason for it stays true.
 *
 * STRUCT-02: it proxies and decides nothing. Which numbers name an order is the
 * backend's to answer (DATA-13).
 */
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/**
 * SEC-02 — the path segment is untrusted input, so its LENGTH is too. The
 * shape of an order number is deliberately not asserted: that is the backend's
 * rule (DATA-13), and a client that encoded it would hold a second copy of it.
 * This declines only what cannot be a number at all.
 */
const MAX_ORDER_NUMBER_LENGTH = 64;

function isPossibleOrderNumber(value: string): boolean {
  return value.length > 0 && value.length <= MAX_ORDER_NUMBER_LENGTH && !/\s/.test(value);
}

interface RouteContext {
  /** NEXT-03: dynamic params are a Promise in Next.js 16. */
  params: Promise<{ orderNumber: string }>;
}

/** §28.3 — a guest returns to their order by its number. */
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own
  // module context or the first request after a hot reload hits a real socket.
  await ensureMockServer();

  const { orderNumber } = await context.params;
  if (!isPossibleOrderNumber(orderNumber)) return new Response(null, { status: 404 });

  const result = await fetchOrder(orderNumber);

  if (!result.ok) {
    /*
     * ERR-02 — the discriminant is the whole point of this branch, and
     * collapsing it is the defect this change exists to remove. A number that
     * names no order is an ordinary business state and answers 404. Anything
     * else is the store being unreachable, and MUST NOT be dressed up as one:
     * saying "no such order" to someone holding a receipt sends them looking
     * for a mistake they did not make.
     */
    if (result.error.kind === 'NOT_FOUND') return new Response(null, { status: 404 });

    logApiError('api:checkout:order', result.error); // ERR-10
    return new Response(null, { status: 502 });
  }

  return Response.json(result.value, { headers: NO_STORE });
}
