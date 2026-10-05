/**
 * R-03 — what counts as the media host, and what a media address looks like.
 *
 * Pure and dependency-free on purpose: `next.config.ts` (CSP, `remotePatterns`),
 * the client environment schema and the image loader all read it, and the loader
 * ships to the browser, so nothing heavy may come in with it.
 *
 * Media keys are immutable and carry a content hash (plan 3.4.4):
 * `products/<photoFile>/<frame>-<width>-<hash8>.avif`, widths 480, 960 and 1600.
 */

/** The three widths each photograph is uploaded at, ascending. */
export const MEDIA_WIDTHS = [480, 960, 1600] as const;
const WIDEST_MEDIA_WIDTH = 1600;

/** A bare host with an optional port: `media.example.com`, `localhost:9000`. No scheme, no path. */
const MEDIA_HOST_PATTERN =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$/i;

/** `<frame>-<width>-<hash8>.avif`, the width being one of the three uploaded. */
const MEDIA_FILE_PATTERN = /^(.+)-(480|960|1600)-([0-9a-f]{8})\.avif$/;

/** Returns the lower-cased host, or `null` when the value is not a bare host. */
export function parseMediaHost(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim().toLowerCase();
  return MEDIA_HOST_PATTERN.test(trimmed) ? trimmed : null;
}

/** The smallest uploaded width that is at least `requested`; the widest when none is. */
export function mediaWidthFor(requested: number): (typeof MEDIA_WIDTHS)[number] {
  return MEDIA_WIDTHS.find((width) => width >= requested) ?? WIDEST_MEDIA_WIDTH;
}

/**
 * The same address with the width swapped for the smallest bucket that covers
 * `requested`. Anything that is not a hashed media file ON THE MEDIA HOST comes
 * back unchanged: the local fixtures in `public/`, the logo, another host.
 */
export function mediaAddressForWidth(
  src: string,
  requested: number,
  mediaHost: string | null,
): string {
  if (mediaHost === null) return src;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (url.protocol !== 'https:' || url.host.toLowerCase() !== mediaHost) return src;
  const slash = url.pathname.lastIndexOf('/');
  const file = url.pathname.slice(slash + 1);
  const match = MEDIA_FILE_PATTERN.exec(file);
  if (match === null) return src;
  url.pathname = `${url.pathname.slice(0, slash + 1)}${match[1]}-${mediaWidthFor(requested)}-${match[3]}.avif`;
  return url.toString();
}

/** True for an address on the media host. Used by Try-On (R-04) to allow-list the garment fetch. */
export function isMediaAddress(src: string, mediaHost: string | null): boolean {
  if (mediaHost === null) return false;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && url.host.toLowerCase() === mediaHost;
  } catch {
    return false;
  }
}
