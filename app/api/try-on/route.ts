import { generateTryOn } from '@/features/try-on';
import { productIdSchema } from '@/lib/domain/ids';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';

/**
 * DATA-08 — the seventh BFF, and architecture §24's only footprint in `app/`.
 *
 * It exists for the reason the others do: `apiRequest` is `server-only`, and a
 * photograph is chosen in a file picker in the browser. It proxies and nothing
 * else. The white-balance correction, the provider call, the timeout and the
 * deletion guarantee are all §24's, behind `apiRequest`, in the module that
 * owns them.
 *
 * ## What this route must not do, and does not
 *
 * §24: "No customer photograph is written to storage, backup **or log** at any
 * point." So the body is never logged, never buffered to disk, never spooled
 * into a cache — it is read once as a form field and handed straight on. The
 * failure path below logs an `ApiError`, which carries a kind, a message and a
 * path, and has no field capable of holding a photograph.
 */
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function POST(request: Request): Promise<Response> {
  // D1 — a Route Handler never renders the root layout, so it arms its own
  // module context or the first request after a hot reload hits a real socket.
  await ensureMockServer();

  /*
   * SEC-08. Nothing here changes durable state, so this is not the usual CSRF
   * case — but a generation spends a metered external resource on the
   * customer's behalf, and a POST that costs money on every call is worth
   * refusing from another origin.
   */
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: NO_STORE });

  const form = await request.formData();
  const productId = form.get('productId');
  const photo = form.get('photo');

  // SEC-02: untrusted input, and a form entry is a File OR a string.
  if (photo === null || typeof photo === 'string') {
    return new Response(null, { status: 400, headers: NO_STORE });
  }

  /*
   * The id is parsed rather than passed through. `productIdSchema` both
   * validates the shape and brands it, so what reaches the caller is a
   * `ProductId` and not a string that happens to look like one (TS-12).
   */
  const parsedId = productIdSchema.safeParse(productId);
  if (!parsedId.success) return new Response(null, { status: 400, headers: NO_STORE });

  const result = await generateTryOn(parsedId.data, photo);

  if (!result.ok) {
    logApiError('api:try-on', result.error); // ERR-10

    /*
     * A refused photograph is the customer's to fix and is passed through as a
     * 400; everything else is ours and is not described to them (ERR-11,
     * SEC-07). The interface has its own copy for both.
     */
    const status = result.error.kind === 'VALIDATION' ? 400 : 502;
    return new Response(null, { status, headers: NO_STORE });
  }

  return Response.json(result.value, { headers: NO_STORE });
}
