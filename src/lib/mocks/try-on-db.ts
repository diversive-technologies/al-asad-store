import { readFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { CATALOGUE, type CatalogueRecord } from './catalogue-db';
import { toProductDetail } from './product-detail-db';
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
 * The longest edge sent to the provider.
 *
 * A modern phone photograph is 4000px on its long edge, which is several times
 * more than the model uses and pays for the difference in latency on a
 * connection this market is sensitive about (§30.1).
 */
const MAX_EDGE_PX = 1024;

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
  | { status: 'READY'; image: { dataUrl: string; widthPx: number; heightPx: number } }
  | { status: 'UNAVAILABLE'; reason: RenderFailure }
  /** Not a §24 outcome — a rejected upload is a 400, and the handler makes it one. */
  | { status: 'PHOTO_REJECTED' };

/**
 * White balance, by the grey-world assumption: over a whole photograph the
 * channel means should be roughly equal, so the gains that equalise them undo
 * the cast of the light it was taken under.
 *
 * This is the step that makes the feature worth having in this market. Ethnic
 * apparel is bought on colour, most photographs are taken indoors under warm
 * tungsten or green-tinted fluorescent light, and an uncorrected photograph
 * would drag the garment's rendered colour toward the room's cast — turning a
 * bottle green waistcoat olive and making the try-on lie about the one
 * attribute the customer opened it to check.
 *
 * `rotate()` with no argument applies the EXIF orientation. Without it a
 * portrait taken on a phone arrives rotated, and every downstream judgement
 * about the person is made against a sideways image.
 */
export async function correctWhiteBalance(photo: ImagePayload): Promise<ImagePayload | null> {
  const input = Buffer.from(photo.bytes);

  // ERR-05(1): sharp signals an unreadable or truncated image only by throwing.
  // Converted to a value here; it does not propagate.
  try {
    const { channels } = await sharp(input).stats();
    const [red, green, blue] = channels;

    if (red === undefined || green === undefined || blue === undefined) return null;

    const grey = (red.mean + green.mean + blue.mean) / 3;
    // A fully black channel has no cast to correct and would divide by zero.
    const gain = (mean: number): number => (mean <= 0 ? 1 : grey / mean);

    const bytes = await sharp(input)
      .rotate()
      // `linear` takes one gain per channel, so alpha is flattened away first.
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .linear([gain(red.mean), gain(green.mean), gain(blue.mean)], [0, 0, 0])
      .resize({ width: MAX_EDGE_PX, height: MAX_EDGE_PX, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    return { bytes, mimeType: 'image/jpeg' };
  } catch {
    return null;
  }
}

/**
 * The garment's own photograph, converted out of AVIF.
 *
 * The conversion is required rather than tidy: the catalogue is stored as AVIF
 * and the provider does not accept it, so sending the file as it sits on disk
 * would fail every time. The path is composed from the catalogue's own record,
 * never from anything a caller supplied.
 */
async function garmentImage(mediaUrl: string): Promise<ImagePayload | null> {
  // ERR-05(1): `readFile` and sharp both signal only by throwing.
  try {
    const file = path.join(process.cwd(), 'public', mediaUrl);

    const bytes = await sharp(await readFile(file))
      .resize({ width: MAX_EDGE_PX, height: MAX_EDGE_PX, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    return { bytes, mimeType: 'image/jpeg' };
  } catch {
    return null;
  }
}

/** The provider returns bytes; the contract returns a data URL and its size. */
async function toTryOnImage(image: ImagePayload): Promise<TryOnOutcome> {
  // ERR-05(1): sharp throws on an image it cannot read.
  try {
    const { width, height } = await sharp(image.bytes).metadata();

    if (width === undefined || height === undefined) {
      return { status: 'UNAVAILABLE', reason: 'PROVIDER_FAILED' };
    }

    const base64 = Buffer.from(image.bytes).toString('base64');

    return {
      status: 'READY',
      image: {
        dataUrl: `data:${image.mimeType};base64,${base64}`,
        widthPx: width,
        heightPx: height,
      },
    };
  } catch {
    return { status: 'UNAVAILABLE', reason: 'PROVIDER_FAILED' };
  }
}

export function findTryOnProduct(productId: string): CatalogueRecord | null {
  return CATALOGUE.find((record) => record.id === productId) ?? null;
}

/**
 * §24 `generate(product_id, colour_id, photo) -> Image | Unavailable`.
 *
 * The colour is resolved from the product rather than supplied, and no size is
 * accepted at all — see the contract for why both are deliberate.
 */
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

export async function generateTryOn(
  record: CatalogueRecord,
  photo: ImagePayload,
  options: GenerateOptions,
): Promise<TryOnOutcome> {
  const session: { id: string; startedAt: string } = {
    id: `tryon-${String(SESSIONS.size + 1)}`,
    startedAt: new Date().toISOString(),
  };

  const close = (outcome: TryOnSession['outcome']): void => {
    SESSIONS.set(session.id, { ...session, productId: record.id, outcome });
  };

  /*
   * SEC-03 — the enforcement point is here, not in the browser.
   *
   * The interface checks the same two things before uploading, and that check
   * is an affordance: it saves the customer a doomed 20MB upload over a mobile
   * connection. It is not protection. This module is reachable by anything that
   * can form a request, so it applies the limits again and does so on the values
   * it OWNS — the same two the offer advertises, so the two can never disagree.
   */
  const tooLarge = photo.bytes.byteLength > MAX_PHOTO_BYTES;
  const wrongFormat = !ACCEPTED_FORMATS.includes(photo.mimeType.toLowerCase());

  if (tooLarge || wrongFormat) {
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

  if (!configured) {
    // Paced so the waiting state is seen; see SAMPLE_LATENCY_MS.
    await new Promise((resolve) => setTimeout(resolve, SAMPLE_LATENCY_MS));

    const sample = await toTryOnImage(garment);
    close(sample.status === 'READY' ? 'SAMPLE' : 'PROVIDER_FAILED');

    return sample;
  }

  const rendered = await imageModelProvider.render(
    {
      correctedPhoto: corrected,
      productImage: garment,
      garmentDescription: detail.name,
    },
    AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  );

  if (!rendered.ok) {
    close(rendered.error);
    return { status: 'UNAVAILABLE', reason: rendered.error };
  }

  const outcome = await toTryOnImage(rendered.value);

  close(outcome.status === 'READY' ? 'READY' : 'PROVIDER_FAILED');

  /*
   * The customer's photograph goes out of scope here, along with its corrected
   * copy. Neither was ever written anywhere, so both are gone the moment this
   * frame is popped — on this path and on every early return above it.
   */
  return outcome;
}
