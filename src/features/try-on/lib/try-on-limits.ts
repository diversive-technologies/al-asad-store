/**
 * §24 Try-On — what the module accepts, how long it waits, how big it sends.
 *
 * SSOT-00: these are the module's own rules and they live here once. The OFFER
 * carries the two the browser needs (`maxPhotoBytes`, `acceptedFormats`) so the
 * picker can refuse a photograph before it is uploaded, and the module enforces
 * them again on the way in — a client-side check is a courtesy, never a control
 * (SEC-03).
 *
 * Pure: no React, no I/O, no environment. `lib/photo.ts` beside this file does
 * the browser-side check against the offer; nothing here imports it.
 */

/**
 * The largest photograph the module will take.
 *
 * Eight megabytes is comfortably above a modern phone's full-resolution JPEG
 * and well under the point where holding one in memory matters. The BFF refuses
 * a larger declared `Content-Length` before buffering anything at all.
 */
export const MAX_PHOTO_BYTES = 8_000_000;

/**
 * The formats the module will decode.
 *
 * AVIF is absent deliberately, even though the catalogue is stored in it: the
 * image model does not accept AVIF, so offering it would let a customer choose
 * a photograph this module could take and then fail to use. The garment's own
 * AVIF is converted before it is sent, which is a different matter — see
 * `garmentImage`.
 */
export const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * The longest edge sent to the model.
 *
 * A modern phone photograph is around 4000px on its long edge, several times
 * more than the model uses, and the difference is paid for in latency on
 * connections this market is sensitive about (§30.1). Both images are reduced
 * to this before they are sent.
 */
export const MAX_EDGE_PX = 1024;

/**
 * How long the module waits for the model before giving up.
 *
 * It sits BELOW the frontend's own budget (`TRY_ON_REQUEST_TIMEOUT_MS`, 35s) on
 * purpose: the module's typed TIMEOUT should win the race, so the customer is
 * told what happened rather than seeing a generic transport abort.
 */
export const PROVIDER_TIMEOUT_MS = 30_000;

/**
 * How long the labelled SAMPLE pretends to take.
 *
 * It applies only when no key is configured. A real generation runs for tens of
 * seconds; the sample is ready in a few hundred milliseconds because all it
 * does is re-encode a file already on disk. Returning it instantly would make
 * the waiting state — which is most of what this feature feels like — invisible
 * and untested. A configured provider is never delayed.
 */
export const SAMPLE_LATENCY_MS = 2600;

/**
 * Whether the module refuses this photograph outright.
 *
 * SEC-03 — enforced here as well as in the picker, because the picker runs in
 * the customer's browser and anything that runs there is a suggestion.
 */
export function refusesPhoto(byteLength: number, mimeType: string): boolean {
  const accepted: readonly string[] = ACCEPTED_FORMATS;
  return byteLength <= 0 || byteLength > MAX_PHOTO_BYTES || !accepted.includes(mimeType);
}
