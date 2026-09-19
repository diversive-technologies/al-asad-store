import { CATALOGUE, type CatalogueRecord } from './catalogue-db';
import { toProductDetail } from './product-detail-db';
import { correctWhiteBalance, garmentImage, toTryOnImage, type TryOnImage } from './try-on-images';
import { imageModelProvider, type ImagePayload, type RenderFailure } from './try-on-provider';

/**
 * Architecture §24 Try-On — module 14, standing in for Java under D1.
 *
 * ## The invariants this file exists to hold
 *
 * §24 is unusually prescriptive, and every line of it is here:
 *
 * - the photograph is corrected for white balance, sent, and **deleted
 *   immediately** — on success, on failure, on timeout and on cancellation;
 * - no customer photograph is written to storage, backup **or log**;
 * - the generated result is returned to the browser and not retained;
 * - requests time out at the configured limit;
 * - the module owns **ephemeral session records only**.
 *
 * ## How deletion is guaranteed rather than promised
 *
 * By never writing. The photograph exists as a local `Uint8Array` for the life
 * of one function call and is referenced by nothing that outlives it: no disk,
 * no cache, no module-scoped map, no log line. There is no delete step because
 * there is no stored copy to delete, which is the strongest form of the
 * guarantee and the only one a reader can verify by looking.
 *
 * `SESSIONS` below is what §24 permits the module to own, and its record type
 * has no field capable of holding an image. `try-on-db.test.ts` asserts that
 * over both the success and the failure paths, so a later edit that starts
 * keeping "just the result, for debugging" fails the suite.
 */

/**
 * Configuration register #23 — Try-On request timeout, 30 seconds.
 *
 * It lives HERE, with the module that owns it, and not in the frontend's
 * constants: it is a backend value, and a copy on the other side of the wire
 * would be a second source of truth that drifts the first time it is retuned
 * (DATA-13). The frontend has its own, deliberately larger budget.
 */
const PROVIDER_TIMEOUT_MS = 30_000;

/**
 * What the module accepts, and the answer `isAvailable()` carries with it.
 *
 * AVIF is absent deliberately even though the catalogue is stored in it: the
 * provider does not accept AVIF, so offering it would produce a photo this
 * module could take and then fail to use.
 */
const MAX_PHOTO_BYTES = 8_000_000;
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * How long the SAMPLE result pretends to take, in milliseconds.
 *
 * A real generation runs for tens of seconds; the sample is ready in about
 * three hundred milliseconds, because all it does is decode a file that is
 * already on disk. Returning it instantly would make the interface look wrong
 * in the opposite direction — the customer would press the button and the
 * result would already be there, which is not what this will feel like in
 * production and would leave the waiting state untested and unseen.
 *
 * This pacing exists ONLY for the sample. A configured provider is never
 * delayed.
 */
const SAMPLE_LATENCY_MS = 2600;

/**
 * §24: "Owns. Ephemeral session records only."
 *
 * Note what this type cannot express. There is no photo field, no image field
 * and no url field — not "left empty", but absent, so retaining a picture here
 * would take a schema change rather than an assignment.
 */
export interface TryOnSession {
  readonly id: string;
  readonly productId: string;
  readonly startedAt: string;
  readonly outcome: 'READY' | 'SAMPLE' | 'PHOTO_REJECTED' | RenderFailure;
}

const SESSIONS = new Map<string, TryOnSession>();

/** Test seam. In Java this is a table with a retention policy. */
export function tryOnSessions(): TryOnSession[] {
  return [...SESSIONS.values()];
}

export function resetTryOnSessions(): void {
  SESSIONS.clear();
}

export interface TryOnOfferPayload {
  available: boolean;
  maxPhotoBytes: number;
  acceptedFormats: string[];
}

/**
 * §24 `isAvailable()`, given the same policy `generateTryOn` is given.
 *
 * Answered from configuration alone — it never calls the provider. Asking the
 * external service whether it is up, on every product page render, would put
 * that service on the page's critical path to answer a question about our own
 * configuration, which is the coupling ADR 12 exists to prevent.
 */
export function tryOnOffer(options: GenerateOptions): TryOnOfferPayload {
  /*
   * The two answers have to agree, and this is the line that keeps them
   * agreeing. If the sample is what a generation will return, then the feature
   * IS available — reporting otherwise would make the panel announce that
   * try-on is switched off and then produce an image anyway, which is worse
   * than either state on its own.
   */
  return {
    available: imageModelProvider.isConfigured() || options.sampleWhenUnconfigured,
    maxPhotoBytes: MAX_PHOTO_BYTES,
    acceptedFormats: [...ACCEPTED_FORMATS],
  };
}

export type TryOnOutcome =
  | { status: 'READY'; image: TryOnImage }
  /** The garment's own photograph standing in for a generation — and saying so. */
  | { status: 'SAMPLE'; image: TryOnImage }
  | { status: 'UNAVAILABLE'; reason: RenderFailure }
  /** Not a §24 outcome — a rejected upload is a 422, and the handler makes it one. */
  | { status: 'PHOTO_REJECTED' };

export function findTryOnProduct(productId: string): CatalogueRecord | null {
  return CATALOGUE.find((record) => record.id === productId) ?? null;
}

/** The policy a generation is TOLD, standing in for Java configuration. */
export interface GenerateOptions {
  /**
   * With no provider configured, answer with a SAMPLE image instead of
   * reporting the feature unavailable.
   *
   * A POLICY, passed in rather than read here, because that is what makes both
   * branches testable in one process — an environment variable read inside this
   * module could only ever be one value per test run, and the honest
   * unavailable path is the one that must not rot.
   *
   * The sample is the garment's own catalogue photograph. It is a placeholder
   * for a demonstrable interface and NOT a generated image: it shows the piece
   * on the model it was shot on, not on the customer. It goes the moment a real
   * provider is connected, and `TRY_ON_SAMPLE_RESULT=disabled` turns it off
   * without one.
   */
  readonly sampleWhenUnconfigured: boolean;
}

/**
 * How many sessions have been opened, for their ids. A counter, not the map's
 * size: generations overlap, and two opened before either closed took one id
 * from the size, so the second record overwrote the first (D6).
 */
let opened = 0;

/** Records how one generation ended — the only thing §24 lets the module keep. */
function openSession(record: CatalogueRecord): (outcome: TryOnSession['outcome']) => void {
  opened += 1;
  const session = { id: `tryon-${String(opened)}`, startedAt: new Date().toISOString() };

  return (outcome) => {
    SESSIONS.set(session.id, { ...session, productId: record.id, outcome });
  };
}

/**
 * SEC-03 — the enforcement point is here, not in the browser.
 *
 * The interface checks the same two things before uploading, and that check is
 * an affordance: it saves the customer a doomed 20MB upload over a mobile
 * connection. It is not protection. This module is reachable by anything that
 * can form a request, so it applies the limits again and does so on the values
 * it OWNS — the same two the offer advertises, so the two can never disagree.
 */
function refusesPhoto(photo: ImagePayload): boolean {
  const tooLarge = photo.bytes.byteLength > MAX_PHOTO_BYTES;
  const wrongFormat = !ACCEPTED_FORMATS.includes(photo.mimeType.toLowerCase());
  return tooLarge || wrongFormat;
}

/** A picture as the contract's outcome; one that cannot be read is the provider failing. */
async function outcomeOf(image: ImagePayload): Promise<TryOnOutcome> {
  const ready = await toTryOnImage(image);
  return ready === null
    ? { status: 'UNAVAILABLE', reason: 'PROVIDER_FAILED' }
    : { status: 'READY', image: ready };
}

/** The SAMPLE: the garment's own photograph, paced so the waiting state is seen. */
async function sampleOutcome(
  garment: ImagePayload,
  close: (outcome: TryOnSession['outcome']) => void,
): Promise<TryOnOutcome> {
  await new Promise((resolve) => setTimeout(resolve, SAMPLE_LATENCY_MS));

  const sample = await outcomeOf(garment);
  if (sample.status !== 'READY') {
    close('PROVIDER_FAILED');
    return sample;
  }

  // The wire says SAMPLE as the session does, so no screen can present it as a generation.
  close('SAMPLE');
  return { status: 'SAMPLE', image: sample.image };
}

/** A real generation, under the configured timeout. */
async function providerOutcome(
  request: Parameters<typeof imageModelProvider.render>[0],
  close: (outcome: TryOnSession['outcome']) => void,
): Promise<TryOnOutcome> {
  const rendered = await imageModelProvider.render(
    request,
    AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  );

  if (!rendered.ok) {
    close(rendered.error);
    return { status: 'UNAVAILABLE', reason: rendered.error };
  }

  const outcome = await outcomeOf(rendered.value);
  close(outcome.status === 'READY' ? 'READY' : 'PROVIDER_FAILED');
  return outcome;
}

/**
 * §24 `generate(product_id, colour_id, photo) -> Image | Unavailable`.
 *
 * The colour is resolved from the product rather than supplied, and no size is
 * accepted at all — see the contract for why both are deliberate.
 */
export async function generateTryOn(
  record: CatalogueRecord,
  photo: ImagePayload,
  options: GenerateOptions,
): Promise<TryOnOutcome> {
  const close = openSession(record);

  if (refusesPhoto(photo)) {
    close('PHOTO_REJECTED');
    return { status: 'PHOTO_REJECTED' };
  }

  const configured = imageModelProvider.isConfigured();

  if (!configured && !options.sampleWhenUnconfigured) {
    close('PROVIDER_DISABLED');
    return { status: 'UNAVAILABLE', reason: 'PROVIDER_DISABLED' };
  }

  /*
   * The correction runs on the sample path too, deliberately. It is the step
   * §24 actually requires of this module, it is the one piece of real image
   * work the demo exercises, and a photograph that cannot be decoded must be
   * refused the same way whether or not a provider is waiting for it.
   */
  const corrected = await correctWhiteBalance(photo);

  if (corrected === null) {
    close('PHOTO_REJECTED');
    return { status: 'PHOTO_REJECTED' };
  }

  const detail = toProductDetail(record, 'en');
  const garment = await garmentImage(detail.media[0]?.url ?? '');

  if (garment === null) {
    close('PROVIDER_FAILED');
    return { status: 'UNAVAILABLE', reason: 'PROVIDER_FAILED' };
  }

  /*
   * The customer's photograph goes out of scope when this returns, along with
   * its corrected copy. Neither was ever written anywhere, so both are gone the
   * moment the frame is popped — on every path, early returns included.
   */
  return configured
    ? providerOutcome(
        { correctedPhoto: corrected, productImage: garment, garmentDescription: detail.name },
        close,
      )
    : sampleOutcome(garment, close);
}
