/**
 * R-02 — the pure half of the media tool: how a source file is named, how a key is
 * made, and what the manifest says. Nothing here touches the disk or the network,
 * so the rules of plan 3.4.4 are testable on their own.
 *
 * Keys are immutable and carry a content hash, so a changed file is a NEW key and
 * no cache ever needs purging:
 *
 *   products/<photoFile>/<frame>-<width>-<hash8>.avif   widths 480, 960, 1600
 *   hero/<name>-<hash8>.<ext>
 *
 * `<hash8>` is the first 8 hex characters of the SHA-256 of the 1600-wide file for
 * a photograph (all three widths share it), and of the file itself for hero media.
 */

import { createHash } from 'node:crypto';

/** The three widths each photograph is uploaded at. Mirrors src/lib/media/media-host.ts. */
export const WIDTHS = [480, 960, 1600];

/** A source photograph narrower than this is refused: the 1600 file would be upscaled. */
export const MIN_SOURCE_WIDTH = 1200;

/** Output shape: portrait 4:5. */
export const ASPECT = { width: 4, height: 5 };

/** AVIF quality (plan R-02). */
export const AVIF_QUALITY = 55;

/** Source photograph formats accepted. */
export const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'];

export const CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** First 8 hex characters of the SHA-256 of `bytes`. */
export function hash8(bytes) {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 8);
}

/**
 * `<photoFile>-<frame>.<ext>` becomes `{ photoFile, frame }`. The frame is what
 * follows the LAST hyphen, so a photoFile may itself contain hyphens
 * (`lawn-suit-01-3.jpg` is photoFile `lawn-suit-01`, frame `3`). Returns `null`
 * for a name that does not fit the rule.
 */
export function parseSourceName(fileName) {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) return null;
  const stem = fileName.slice(0, dot);
  const hyphen = stem.lastIndexOf('-');
  if (hyphen <= 0 || hyphen === stem.length - 1) return null;
  const photoFile = stem.slice(0, hyphen);
  const frame = stem.slice(hyphen + 1);
  const safe = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
  if (!safe.test(photoFile) || !/^[A-Za-z0-9_]+$/.test(frame)) return null;
  return { photoFile, frame };
}

/** The key of one width of one frame. */
export function productKey(photoFile, frame, width, hash) {
  return `products/${photoFile}/${frame}-${width}-${hash}.avif`;
}

/** The key of one hero file (video, poster, logo): `hero/<name>-<hash8>.<ext>`. */
export function heroKey(fileName, hash) {
  const dot = fileName.lastIndexOf('.');
  const name = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot).toLowerCase() : '';
  return `hero/${name}-${hash}${ext}`;
}

/** Frames in natural order: 2 before 10, and numbers before words. */
export function compareFrames(a, b) {
  const an = /^\d+$/.test(a);
  const bn = /^\d+$/.test(b);
  if (an && bn) return Number(a) - Number(b);
  if (an !== bn) return an ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The centred 4:5 crop of a `width` x `height` image, as sharp's `extract` box.
 * A wider image loses its sides, a taller one its top and bottom.
 */
export function cropBox(width, height) {
  const targetWidth = Math.min(width, Math.floor((height * ASPECT.width) / ASPECT.height));
  const targetHeight = Math.min(height, Math.floor((width * ASPECT.height) / ASPECT.width));
  return {
    left: Math.floor((width - targetWidth) / 2),
    top: Math.floor((height - targetHeight) / 2),
    width: targetWidth,
    height: targetHeight,
  };
}

/**
 * The manifest: for each photoFile the ordered list of 1600-wide keys, plus the
 * hero keys by source file name. Keys are sorted so the file is stable between runs.
 *
 * `frames` is `[{ photoFile, frame, key1600 }]`, `hero` is `[{ fileName, key }]`.
 */
export function buildManifest(frames, hero) {
  const byPhoto = new Map();
  for (const frame of frames) {
    const list = byPhoto.get(frame.photoFile) ?? [];
    list.push(frame);
    byPhoto.set(frame.photoFile, list);
  }
  const products = {};
  for (const photoFile of [...byPhoto.keys()].sort()) {
    products[photoFile] = byPhoto
      .get(photoFile)
      .sort((a, b) => compareFrames(a.frame, b.frame))
      .map((frame) => frame.key1600);
  }
  const heroKeys = {};
  for (const entry of [...hero].sort((a, b) => (a.fileName < b.fileName ? -1 : 1))) {
    heroKeys[entry.fileName] = entry.key;
  }
  return { version: 1, products, hero: heroKeys };
}
