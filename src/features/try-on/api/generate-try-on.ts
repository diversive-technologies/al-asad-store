import 'server-only';

import { fetchProductsByIds } from '@/features/catalogue';
import type { Locale } from '@/i18n/locales';
import type { ApiError } from '@/lib/api/errors';
import type { ProductId } from '@/lib/domain/ids';
import { ok, type Result } from '@/lib/result';

import { PROVIDER_TIMEOUT_MS, SAMPLE_LATENCY_MS, refusesPhoto } from '../lib/try-on-limits';
import type { ImagePayload } from '../schemas/provider.schema';
import type { TryOnResult } from '../schemas/try-on.schema';
import { isTryOnAvailable } from './fetch-try-on-offer';
import { imageModelProvider } from './gemini-provider';
import { correctWhiteBalance, garmentImage, toTryOnImage } from './try-on-images';

/**
 * §24 Try-On — the module, and the whole of it.
 *
 * ## It does not go through the Java backend, and that is deliberate
 *
 * Every other read in this storefront is `apiRequest` to a contract the Java
 * service owns. This one is not, because there is nothing on the other side to
 * own it: §24 is a frontend capability sitting on an image model, and routing
 * it through a backend that does not implement it — as the mock layer used to —
 * would be a pretend round trip whose only effect is to make the feature look
 * like it needs a service it does not.
 *
 * What it DOES read from the backend is the catalogue: the garment's name and
 * its photograph come from the ordinary product projection, so the try-on can
 * never disagree with the product page about what the customer is looking at.
 * That read works against the mocks or against Java without either caring.
 *
 * ## The customer's photograph is never stored
 *
 * It arrives as bytes, is corrected in memory, is sent, and goes out of scope
 * when this function returns. There is no disk write, no cache, no session
 * record holding it, and nothing in this module has a field that could (§30.4).
 * The failure log carries an `ApiError`, which has nowhere to put a picture.
 *
 * ## The order of the work, and why it is that order
 *
 * The garment is fetched BEFORE the provider is asked, because a missing
 * garment is a fault in the store rather than in the model and should not be
 * reported as the model having failed — and because a request that cannot
 * succeed should not be paid for.
 */

/** ERR-03 — a photograph the module will not take is a VALIDATION refusal. */
const REFUSED: ApiError = {
  kind: 'VALIDATION',
  message: 'That photograph cannot be used.',
  fieldErrors: {},
};

/** The store does not sell this, so there is nothing to try on. */
const UNKNOWN_PRODUCT: ApiError = {
  kind: 'NOT_FOUND',
  message: 'No such product.',
  resource: 'product',
};

function unavailable(reason: 'PROVIDER_DISABLED' | 'PROVIDER_FAILED' | 'TIMEOUT'): TryOnResult {
  return { status: 'UNAVAILABLE', reason };
}

/**
 * Generate a try-on, or say why not.
 *
 * The `Result` is for faults in the STORE — a photograph refused, a product
 * that is not ours, a garment we cannot read. A model that is switched off,
 * fails or times out is an `ok` carrying `UNAVAILABLE`: that is the module
 * answering, and the customer is told something different in each case.
 */
export async function generateTryOn(
  productId: ProductId,
  photo: File,
  locale: Locale,
): Promise<Result<TryOnResult, ApiError>> {
  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (refusesPhoto(bytes.byteLength, photo.type)) return { ok: false, error: REFUSED };

  const products = await fetchProductsByIds([productId], locale);
  if (!products.ok) return products;

  const product = products.value[0];
  if (product === undefined) return { ok: false, error: UNKNOWN_PRODUCT };

  const garment = await garmentImage(product.images[0] ?? '');
  // The store cannot show its own garment: the model is not at fault and is not asked.
  if (garment === null) return ok(unavailable('PROVIDER_FAILED'));

  const corrected = await correctWhiteBalance({ bytes, mimeType: photo.type });
  // Sharp could not decode it, whatever its declared type said. That is the photo.
  if (corrected === null) return { ok: false, error: REFUSED };

  if (imageModelProvider.isConfigured()) {
    return ok(await render(corrected, garment, product.name));
  }

  /*
   * No credential. `TRY_ON_SAMPLE_RESULT` decides between the labelled sample
   * and §28.5's genuine unavailable state, and it has to agree with what the
   * OFFER said — `isTryOnAvailable` reads the same two values, so the panel
   * cannot announce the feature is off and then produce a picture.
   */
  return ok(isTryOnAvailable() ? await sample(garment) : unavailable('PROVIDER_DISABLED'));
}

/** The real path: the model, under the module's own timeout. */
async function render(
  correctedPhoto: ImagePayload,
  productImage: ImagePayload,
  garmentDescription: string,
): Promise<TryOnResult> {
  /*
   * `AbortSignal.timeout` is what turns a hung provider into the module's own
   * typed TIMEOUT rather than a request the customer watches forever. The
   * adapter reads `signal.aborted` to tell the two apart.
   */
  const outcome = await imageModelProvider.render(
    { correctedPhoto, productImage, garmentDescription },
    AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  );

  if (!outcome.ok) return unavailable(outcome.error);

  const image = await toTryOnImage(outcome.value);
  return image === null ? unavailable('PROVIDER_FAILED') : { status: 'READY', image };
}

/**
 * The fallback when no key is configured: the garment's own catalogue
 * photograph, returned as SAMPLE and labelled as such by the panel.
 *
 * It is not a pretend generation and is never presented as one — `SAMPLE` is a
 * separate status in the contract precisely so the interface cannot show it as
 * a picture of the customer. It exists so that a checkout of this repository
 * with no credential still demonstrates the whole flow: pick, wait, look.
 */
async function sample(garment: ImagePayload): Promise<TryOnResult> {
  await new Promise((resolve) => setTimeout(resolve, SAMPLE_LATENCY_MS));

  const image = await toTryOnImage(garment);
  return image === null ? unavailable('PROVIDER_FAILED') : { status: 'SAMPLE', image };
}
