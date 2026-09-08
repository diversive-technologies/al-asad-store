import { err, ok, type Result } from '@/lib/result';

import type { TryOnOffer } from '../schemas/try-on.schema';

/**
 * MOD-04 — the photograph rules, React-free and testable without a DOM.
 *
 * Every value this checks against arrives from the backend's offer (§24), so
 * nothing here decides what a valid photo is — it only applies what it was
 * told. That is the difference between a client-side affordance and a
 * client-side rule: the customer finds out before a 4MB upload rather than
 * after, and the backend still refuses independently (SEC-03).
 *
 * ## Why the offer is nullable
 *
 * The try-on entry is drawn whether or not the backend answered. When it did
 * not, we have no limits — and INVENTING a ceiling to fall back on would be
 * exactly the second source of truth DATA-13 forbids, wrong the first time the
 * operator retunes the real one. So an absent offer means the client simply
 * does not pre-check; the module still enforces, because it always did.
 */

/** Why a chosen file cannot be sent. One message per member (SSOT-07). */
export type PhotoRejection = 'EMPTY' | 'TOO_LARGE' | 'WRONG_FORMAT';

/**
 * The properties of a chosen file that matter, and only those.
 *
 * Deliberately NOT `File`: taking the DOM type would drag `lib.dom` into a pure
 * module and make this untestable without a browser environment, for two
 * numbers and a string.
 */
export interface PhotoCandidate {
  readonly sizeBytes: number;
  readonly mimeType: string;
}

/**
 * Parse, don't validate — a candidate that survives is a different value from
 * one that has merely been looked at, so the caller cannot forget to check.
 */
export function checkPhoto(
  candidate: PhotoCandidate,
  offer: TryOnOffer | null,
): Result<PhotoCandidate, PhotoRejection> {
  // An empty file is refusable without the backend's help: it is not a photo
  // under any limits, and sending it would waste a round trip to learn so.
  if (candidate.sizeBytes <= 0) return err('EMPTY');

  if (offer === null) return ok(candidate);

  /*
   * Compared case-insensitively because the browser reports what the operating
   * system told it, and that is not guaranteed to match the backend's casing.
   * A photo refused over a capital letter would be indistinguishable, to the
   * customer, from one refused for being the wrong kind of file.
   */
  const mimeType = candidate.mimeType.toLowerCase();
  const accepted = offer.acceptedFormats.some((format) => format.toLowerCase() === mimeType);

  if (!accepted) return err('WRONG_FORMAT');
  if (candidate.sizeBytes > offer.maxPhotoBytes) return err('TOO_LARGE');

  return ok(candidate);
}

/**
 * The ceiling as whole megabytes, for the copy that reports it.
 *
 * Decimal megabytes rather than binary: the number goes in a sentence a
 * customer reads next to what their phone's gallery told them, and phones
 * report decimal. Rounded DOWN, because a limit quoted above the real one
 * sends someone to compress a photo to a size that still gets refused.
 */
export function maxPhotoMegabytes(offer: TryOnOffer): number {
  return Math.floor(offer.maxPhotoBytes / 1_000_000);
}

/**
 * The `accept` attribute for the file input, built from the same offer.
 *
 * It is a filter on the system picker and nothing more — `accept` is trivially
 * bypassed, which is why `checkPhoto` runs on whatever comes back regardless.
 * With no offer it falls back to `image/*`, which narrows the picker to
 * photographs without claiming to know which encodings the backend takes.
 */
export function acceptAttribute(offer: TryOnOffer | null): string {
  return offer === null ? 'image/*' : offer.acceptedFormats.join(',');
}
