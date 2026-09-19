import { readFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import type { ImagePayload } from './try-on-provider';

/**
 * D1 — module 14's IMAGE work, split out of `try-on-db.ts` (MOD-03): the
 * white-balance correction §24 requires, the garment photograph converted out of
 * AVIF, and the provider's bytes turned into what the contract carries.
 *
 * Every function here takes bytes and returns bytes or a value. None of them
 * writes anything anywhere, which is what lets `try-on-db.ts` promise that the
 * customer's photograph is gone the moment one call returns (§24, §30.4).
 */

/**
 * The longest edge sent to the provider.
 *
 * A modern phone photograph is 4000px on its long edge, which is several times
 * more than the model uses and pays for the difference in latency on a
 * connection this market is sensitive about (§30.1).
 */
const MAX_EDGE_PX = 1024;

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
export async function garmentImage(mediaUrl: string): Promise<ImagePayload | null> {
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

/** What the contract carries for a picture: a data URL and its size. */
export interface TryOnImage {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
}

/**
 * The provider returns bytes; the contract returns a data URL and its size.
 * `null` is a picture that cannot be read, which the module reports as the
 * provider having failed.
 */
export async function toTryOnImage(image: ImagePayload): Promise<TryOnImage | null> {
  // ERR-05(1): sharp throws on an image it cannot read.
  try {
    const { width, height } = await sharp(image.bytes).metadata();
    if (width === undefined || height === undefined) return null;

    const base64 = Buffer.from(image.bytes).toString('base64');
    return { dataUrl: `data:${image.mimeType};base64,${base64}`, widthPx: width, heightPx: height };
  } catch {
    return null;
  }
}
