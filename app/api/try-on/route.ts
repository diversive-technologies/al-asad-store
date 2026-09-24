import { fetchTryOnOffer, generateTryOn } from '@/features/try-on';
import { getLocale } from '@/i18n';
import { productIdSchema } from '@/lib/domain/ids';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { declaredLength, NO_STORE, readFormBody } from '@/lib/utils/route';

/**
 * DATA-08 — the seventh BFF, and architecture §24's only footprint in `app/`.
 *
 * It exists for the reason the others do: the module is `server-only`, and a
 * photograph is chosen in a file picker in the browser. It composes and nothing
 * else. The white-balance correction, the prompt, the provider call, the
 * timeout and the deletion guarantee all belong to `features/try-on`.
 *
 * Unlike the other six, what it composes is not a Java contract. §24 runs in
 * this process against an image model, so there is no round trip here to
 * proxy — see `generate-try-on.ts` for why that is deliberate. The mock layer
 * is still armed because the module reads the CATALOGUE for the garment, and
 * that read is Java's.
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

/**
 * What a multipart body carries beyond the photograph itself: the boundary lines,
 * each part's headers, the file name and the product id. A transport allowance,
 * not a rule — the module still enforces the photograph's own ceiling.
 */
const MULTIPART_ALLOWANCE_BYTES = 64 * 1024;

/**
 * Refuses a body too large to be a photograph the module would accept, BEFORE any
 * of it is read. An unguarded `formData()` buffers whatever arrives, so a declared
 * length is checked against the offer's own ceiling first (DATA-13: the number is
 * the backend's). A body that declares no length is not refused on that alone —
 * a proxy between the browser and this function may drop the header — and the
 * module still enforces the photograph's ceiling once it is read.
 */
async function refusedBySize(request: Request): Promise<Response | null> {
  const length = declaredLength(request);
  if (length === null) return null;

  const offer = await fetchTryOnOffer();
  if (!offer.ok) {
    logApiError('api:try-on:offer', offer.error); // ERR-10
    return new Response(null, { status: 502, headers: NO_STORE });
  }

  const ceiling = offer.value.maxPhotoBytes + MULTIPART_ALLOWANCE_BYTES;
  // A refused photograph is the customer's to fix, so it is the route's 400.
  return length > ceiling ? new Response(null, { status: 400, headers: NO_STORE }) : null;
}

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

  const oversized = await refusedBySize(request);
  if (oversized !== null) return oversized;

  // ERR-04 — a body that is not multipart, or arrives cut short, is a 400, never a 500.
  const form = await readFormBody(request);
  const photo = form?.get('photo') ?? null;

  // SEC-02: untrusted input, and a form entry is a File OR a string.
  if (form === null || photo === null || typeof photo === 'string') {
    return new Response(null, { status: 400, headers: NO_STORE });
  }

  /*
   * The id is parsed rather than passed through. `productIdSchema` both
   * validates the shape and brands it, so what reaches the caller is a
   * `ProductId` and not a string that happens to look like one (TS-12).
   */
  const parsedId = productIdSchema.safeParse(form.get('productId'));
  if (!parsedId.success) return new Response(null, { status: 400, headers: NO_STORE });

  const result = await generateTryOn(parsedId.data, photo, await getLocale());

  if (!result.ok) {
    logApiError('api:try-on', result.error); // ERR-10

    /*
     * A refused photograph is the customer's to fix: the module answers
     * VALIDATION and it is passed on as a 400. Everything else is ours and is
     * not described to them (ERR-11, SEC-07). The interface has its own copy
     * for both.
     */
    const status = result.error.kind === 'VALIDATION' ? 400 : 502;
    return new Response(null, { status, headers: NO_STORE });
  }

  return Response.json(result.value, { headers: NO_STORE });
}
