import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { clientEnv } from '@/config/env.client';
import { isMediaAddress, parseMediaHost } from '@/lib/media/media-host';
import { err, ok, type Result } from '@/lib/result';

import type { ImagePayload, SizedImagePayload } from '../schemas/provider.schema';
import { GARMENT_FETCH_TIMEOUT_MS, MAX_EDGE_PX, MAX_GARMENT_BYTES } from '../lib/try-on-limits';
import { whiteBalanceGains } from '../lib/try-on-white-balance';

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
 * The gains are bounded (`try-on-white-balance.ts`): grey-world cannot tell a
 * warm light from a warm scene, and unbounded it repaints a face.
 *
 * `rotate()` with no argument applies the EXIF orientation. Without it a
 * portrait taken on a phone arrives rotated, and every downstream judgement
 * about the person is made against a sideways image.
 *
 * The size it was prepared at comes back with it, because the output is asked
 * for in the same shape — see `aspectRatioFor`.
 */
export async function correctWhiteBalance(photo: ImagePayload): Promise<SizedImagePayload | null> {
  const input = Buffer.from(photo.bytes);

  // ERR-05(1): sharp signals an unreadable or truncated image only by throwing.
  // Converted to a value here; it does not propagate.
  try {
    const { channels } = await sharp(input).stats();
    const [red, green, blue] = channels;

    if (red === undefined || green === undefined || blue === undefined) return null;

    const gains = whiteBalanceGains({ red: red.mean, green: green.mean, blue: blue.mean });

    const { data, info } = await sharp(input)
      .rotate()
      // `linear` takes one gain per channel, so alpha is flattened away first.
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .linear([...gains], [0, 0, 0])
      .resize({ width: MAX_EDGE_PX, height: MAX_EDGE_PX, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer({ resolveWithObject: true });

    return { bytes: data, mimeType: 'image/jpeg', widthPx: info.width, heightPx: info.height };
  } catch {
    return null;
  }
}

/** Why the garment's photograph could not be had. `detail` is for the log: addresses and statuses only. */
export interface GarmentFault {
  reason: 'PROVIDER_FAILED' | 'TIMEOUT';
  detail: string;
}

/** The converted garment, or why not. A fault is a value (ERR-02), never a throw. */
export type GarmentResult = Result<ImagePayload, GarmentFault>;

const fault = (reason: GarmentFault['reason'], detail: string): GarmentResult =>
  err({ reason, detail });

/**
 * The garment's own photograph, converted out of AVIF.
 *
 * The conversion is required rather than tidy: the catalogue is stored as AVIF
 * and the model does not accept it, so sending the file as it sits would fail
 * every time.
 *
 * Where the photograph comes from depends on its address, which is the catalogue
 * PROJECTION's, never anything a browser sent. It still reaches a filesystem read
 * or an outbound request, so it is treated as untrusted anyway (SEC-02):
 *
 * - A path (`/products/x.avif`) is a local fixture, read from `public/` and
 *   confined there; one that escapes is refused. This is local development and
 *   any deployment still serving fixtures. On a serverless host `public/` is
 *   only on the function's disk because `outputFileTracingIncludes` in
 *   `next.config.ts` puts it there.
 * - An address on the media host (R-04, `NEXT_PUBLIC_MEDIA_HOST`) is fetched:
 *   `https` only, no redirects, `GARMENT_FETCH_TIMEOUT_MS`, at most
 *   `MAX_GARMENT_BYTES`, and the answer must be an image.
 * - Any other absolute address is refused. Nothing here is a general fetcher.
 */
export async function garmentImage(
  mediaUrl: string,
  timeoutMs: number = GARMENT_FETCH_TIMEOUT_MS,
): Promise<GarmentResult> {
  if (/^[a-z][a-z0-9+.-]*:/i.test(mediaUrl) || mediaUrl.startsWith('//')) {
    const host = parseMediaHost(clientEnv.NEXT_PUBLIC_MEDIA_HOST);
    if (!isMediaAddress(mediaUrl, host)) {
      return fault('PROVIDER_FAILED', `${redactAddress(mediaUrl)} is not on the media host`);
    }
    const fetched = await fetchGarment(mediaUrl, timeoutMs);
    return fetched.ok ? convertGarment(fetched.value) : fetched;
  }

  const root = path.join(process.cwd(), 'public');
  const file = path.resolve(root, `.${mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`}`);

  // SEC-02: refuse anything that resolved outside `public/` rather than read it.
  if (!file.startsWith(root)) return fault('PROVIDER_FAILED', `${mediaUrl} is outside public/`);

  // ERR-05(1): `readFile` signals only by throwing.
  try {
    return await convertGarment(await readFile(file));
  } catch {
    return fault('PROVIDER_FAILED', `${mediaUrl || '(no photograph)'} could not be read`);
  }
}

/** Origin and path only: no query, no credentials, whatever the address held. */
function redactAddress(address: string): string {
  try {
    const url = new URL(address);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '(unparseable address)';
  }
}

async function convertGarment(input: Uint8Array): Promise<GarmentResult> {
  // ERR-05(1): sharp signals only by throwing.
  try {
    const bytes = await sharp(input)
      .resize({ width: MAX_EDGE_PX, height: MAX_EDGE_PX, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
    return ok({ bytes, mimeType: 'image/jpeg' });
  } catch {
    return fault('PROVIDER_FAILED', 'the garment photograph could not be decoded');
  }
}

/** One bounded GET. The body is read in chunks so a lying `content-length` cannot pass the cap. */
async function fetchGarment(
  address: string,
  timeoutMs: number,
): Promise<Result<Uint8Array, GarmentFault>> {
  const where = redactAddress(address);
  // ERR-05(1): `fetch` and the body reader signal only by throwing.
  try {
    const response = await fetch(address, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
      headers: { accept: 'image/*' },
    });
    if (!response.ok)
      return err({ reason: 'PROVIDER_FAILED', detail: `${where} answered ${response.status}` });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return err({
        reason: 'PROVIDER_FAILED',
        detail: `${where} is not an image (${contentType || 'no type'})`,
      });
    }
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_GARMENT_BYTES) {
      return err({
        reason: 'PROVIDER_FAILED',
        detail: `${where} is larger than ${MAX_GARMENT_BYTES} bytes`,
      });
    }
    if (response.body === null)
      return err({ reason: 'PROVIDER_FAILED', detail: `${where} had no body` });

    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of response.body) {
      total += chunk.byteLength;
      if (total > MAX_GARMENT_BYTES) {
        return err({
          reason: 'PROVIDER_FAILED',
          detail: `${where} is larger than ${MAX_GARMENT_BYTES} bytes`,
        });
      }
      chunks.push(chunk);
    }
    return ok(Buffer.concat(chunks));
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return timedOut
      ? err({ reason: 'TIMEOUT', detail: `${where} did not answer within ${timeoutMs} ms` })
      : err({ reason: 'PROVIDER_FAILED', detail: `${where} could not be fetched` });
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
