import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import type { ImagePayload } from '../schemas/provider.schema';
import { MAX_EDGE_PX } from '../lib/try-on-limits';

/**
 * §24 — the module's IMAGE work: the white-balance correction the feature is
 * worth having for, the garment photograph converted out of AVIF, and the
 * model's bytes turned into what the contract carries.
 *
 * Every function here takes bytes and returns bytes or a value. None of them
 * writes anything anywhere, which is what lets the module promise the
 * customer's photograph is gone the moment a request returns (§24, §30.4).
 *
 * `server-only`: sharp is a native module and must never be traced into a
 * browser bundle.
 */

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
 * and the model does not accept it, so sending the file as it sits on disk
 * would fail every time.
 *
 * The path is composed from the catalogue PROJECTION, never from anything a
 * browser sent, and it is confined to `public/` — a media url is data from the
 * store's own records, but it reaches a filesystem read, so it is treated as
 * untrusted anyway (SEC-02). A path that escapes is refused rather than read.
 *
 * On a serverless host `public/` is only on the function's disk because
 * `outputFileTracingIncludes` in `next.config.ts` puts it there: nothing the
 * tracer can see imports these files, since the path is built at runtime.
 */
export async function garmentImage(mediaUrl: string): Promise<ImagePayload | null> {
  const root = path.join(process.cwd(), 'public');
  const file = path.resolve(root, `.${mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`}`);

  // SEC-02: refuse anything that resolved outside `public/` rather than read it.
  if (!file.startsWith(root)) return null;

  // ERR-05(1): `readFile` and sharp both signal only by throwing.
  try {
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
 * The model returns bytes; the contract returns a data URL and its size.
 * `null` is a picture that cannot be read, which the module reports as the
 * render having failed.
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
