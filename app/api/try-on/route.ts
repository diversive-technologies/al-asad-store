import { ROUTES } from '@/config/routes';
import { claimTryOnGeneration, fetchTryOnOffer, generateTryOn } from '@/features/try-on';
import { getLocale } from '@/i18n';
import { recordRequestEvents } from '@/lib/analytics';
import { productIdSchema } from '@/lib/domain/ids';
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
 * proxy — see `generate-try-on.ts` for why that is deliberate. The garment
 * still comes from the CATALOGUE, and that read is Java's.
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
 * A generation takes 10–30 seconds, and a host is free to stop a function long
 * before that: a serverless default can be as short as ten. The module gives up
 * on the model at `PROVIDER_TIMEOUT_MS` (30s) and the browser at 35s, so the
 * function is allowed comfortably more than both — otherwise the host kills it
 * first and the customer sees a bare gateway error instead of the module's own
 * TIMEOUT. A literal because segment config must be statically analysable.
 */
export const maxDuration = 60;

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
  /*
   * SEC-08. Nothing here changes durable state, so this is not the usual CSRF
   * case — but a generation spends a metered external resource on the
   * customer's behalf, and a POST that costs money on every call is worth
   * refusing from another origin.
   */
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: NO_STORE });

  const oversized = await refusedBySize(request);
  if (oversized !== null) return oversized;

  /*
   * The product the generation is for, from the ADDRESS (`?productId=`), so the
   * claim below can name it before any of the body is read. The form carries it
   * too and the two must agree (checked once the form is read): a caller cannot
   * claim for one product and generate for another.
   */
  const claimedProduct = productIdSchema.safeParse(
    new URL(request.url).searchParams.get('productId'),
  );
  if (!claimedProduct.success) return new Response(null, { status: 400, headers: NO_STORE });

  /*
   * §24 — Java's claim (T-02), taken BEFORE the body is read and before a
   * generation is spent. A generation costs metered money, so the cheapest
   * possible refusal is the right one: nothing is buffered, nothing is decoded,
   * and the provider is never reached. Java counts for every instance at once —
   * a per-address hourly limit and a daily cap — and a Java that cannot be asked
   * REFUSES: the answer is never "go ahead" by default.
   *
   * A refusal is a 429 with Java's `Retry-After`, because it is temporary and the
   * caller — including a well-behaved script — can act on knowing when.
   */
  const claim = await claimTryOnGeneration(request, claimedProduct.data);
  if (claim !== null) return claim;

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
  if (!parsedId.success || parsedId.data !== claimedProduct.data) {
    return new Response(null, { status: 400, headers: NO_STORE });
  }

  /* M-03 — what happens to a try-on, counted from here: the claim was granted and the
     photograph is acceptable, so a generation really starts. Only the product and a
     one-word outcome are recorded, never the photograph. */
  const event = { path: ROUTES.api.tryOn, productId: parsedId.data } as const;
  await recordRequestEvents(request, { ...event, type: 'try_on_started' });

  const result = await generateTryOn(parsedId.data, photo, await getLocale());

  if (!result.ok) {
    logApiError('api:try-on', result.error); // ERR-10
    await recordRequestEvents(request, {
      ...event,
      type: 'try_on_failed',
      outcome: result.error.kind.toLowerCase(),
    });

    /*
     * A refused photograph is the customer's to fix: the module answers
     * VALIDATION and it is passed on as a 400. Everything else is ours and is
     * not described to them (ERR-11, SEC-07). The interface has its own copy
     * for both.
     */
    const status = result.error.kind === 'VALIDATION' ? 400 : 502;
    return new Response(null, { status, headers: NO_STORE });
  }

  // The module answers UNAVAILABLE for a provider that failed or timed out (ok, not an error).
  await recordRequestEvents(
    request,
    result.value.status === 'READY'
      ? { ...event, type: 'try_on_ready' }
      : { ...event, type: 'try_on_failed', outcome: result.value.reason.toLowerCase() },
  );

  return Response.json(result.value, { headers: NO_STORE });
}
