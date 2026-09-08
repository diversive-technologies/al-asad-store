import { z } from 'zod';

import { productIdSchema } from '@/lib/domain/ids';

/**
 * SSOT-09 — the wire contract for architecture §24 Try-On.
 *
 * §24 exposes two operations and this file is both of them:
 *
 * ```
 * isAvailable() -> boolean
 * generate(product_id, colour_id, photo) -> Image | Unavailable
 * ```
 *
 * Two deviations from that signature are deliberate and stated here rather than
 * buried (§22-J).
 *
 * **`isAvailable` returns more than a boolean.** A client that is about to
 * upload has to know what it may upload, and the size ceiling and accepted
 * formats are the backend's rules — a limit hard-coded here would be a second
 * source of truth that drifts the first time the operator retunes the real one
 * (DATA-13). So the offer carries the answer AND the two constraints. The
 * client checks against what it was told; the backend still enforces, because
 * a client-side check is UX and never the enforcement point (SEC-03).
 *
 * **No `colour_id` is sent.** §6.2 holds colour as three DISPLAY fields on the
 * piece — `displayName`, `description`, `hex` — and no identifier. There is no
 * colour id in the product projection to send, and inventing one client-side
 * would be worse than omitting it. The product determines its own colourway and
 * the backend owns that resolution (DATA-13). When the catalogue grows
 * selectable colourways, the field is added to this schema on that day.
 */

/**
 * §24 `isAvailable()`, plus the upload constraints described above.
 *
 * `available` is answered by the module, not inferred from anything here: with
 * no provider configured it is `false`, which is the §28.5 unavailable state
 * reached honestly rather than simulated.
 */
export const tryOnOfferSchema = z.object({
  available: z.boolean(),
  maxPhotoBytes: z.number().int().positive(),
  /** MIME types, as the backend states them. */
  acceptedFormats: z.array(z.string().min(1)).min(1),
});

export type TryOnOffer = z.infer<typeof tryOnOfferSchema>;

/**
 * Why `Unavailable` carries a reason.
 *
 * §24 names one failure outcome, but the customer needs three different
 * sentences: a feature that is switched off is not the same as one that tried
 * and failed, and neither is the same as one that ran out of time. Collapsing
 * them would make "please try again" the answer to a feature that cannot
 * succeed no matter how many times it is asked.
 */
export const tryOnUnavailableReasonSchema = z.enum([
  'PROVIDER_DISABLED',
  'PROVIDER_FAILED',
  'TIMEOUT',
]);

export type TryOnUnavailableReason = z.infer<typeof tryOnUnavailableReasonSchema>;

/**
 * §24: "The generated result is returned to the browser and not retained
 * server-side."
 *
 * A data URL is that sentence expressed as a type. The schema REFUSES anything
 * else — a backend that answered with a link to stored media would be telling
 * us it had persisted the result, and that is a contract violation rather than
 * a convenience, so it fails at the boundary instead of rendering.
 */
export const tryOnImageSchema = z.object({
  dataUrl: z.string().startsWith('data:image/'),
  widthPx: z.number().int().positive(),
  heightPx: z.number().int().positive(),
});

export type TryOnImage = z.infer<typeof tryOnImageSchema>;

/** §24 `Image | Unavailable`, as a discriminated union (ERR-03). */
export const tryOnResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('READY'), image: tryOnImageSchema }),
  z.object({ status: z.literal('UNAVAILABLE'), reason: tryOnUnavailableReasonSchema }),
]);

export type TryOnResult = z.infer<typeof tryOnResultSchema>;

/**
 * The non-binary half of `generate`. The photograph itself travels as a
 * multipart part and is validated by the route that receives it — it is bytes,
 * not a field, and nothing that can hold it belongs in a schema whose job is to
 * be serialised.
 *
 * Note what is NOT here: no size. A generated image cannot honestly show a
 * small fitting close or a large fitting loose, so the request carries nothing
 * that would imply it had. The absence is the guarantee.
 */
export const tryOnRequestSchema = z.object({ productId: productIdSchema });

export type TryOnRequest = z.infer<typeof tryOnRequestSchema>;
