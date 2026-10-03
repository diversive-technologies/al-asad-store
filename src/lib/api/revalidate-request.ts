import { createHash, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

/**
 * F-06 — the contract of `POST /api/revalidate`, the call the Java worker makes
 * after an import that changed the catalogue or the content.
 *
 * Every tag here is one the storefront's reads attach through `next.tags`; a
 * name that no read carries would be accepted and do nothing, so the list is the
 * reads' own, and anything else is refused.
 */
export const REVALIDATE_TAGS = [
  'catalogue',
  'content',
  'content:homepage',
  'made-to-measure',
  'localisation',
] as const;

export const REVALIDATE_SECRET_HEADER = 'x-revalidate-secret';

/** A body far larger than five short names is not this caller's. */
export const REVALIDATE_MAX_BYTES = 1024;

/** Wrong-secret attempts one client address may make a minute before it is ignored. */
export const REVALIDATE_FAILED_LIMIT_PER_MINUTE = 10;

export const revalidateBodySchema = z.object({
  tags: z.array(z.enum(REVALIDATE_TAGS)).min(1).max(REVALIDATE_TAGS.length),
});

/**
 * Whether `given` is the configured secret, in time that does not depend on how
 * much of it matched. Both sides are hashed first so the two buffers always have
 * the same length, which `timingSafeEqual` requires and which hides the length
 * of the real secret. A missing `expected` or `given` never matches.
 */
export function secretMatches(expected: string | undefined, given: string | null): boolean {
  if (expected === undefined || given === null) return false;

  const digest = (value: string): Buffer => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(expected), digest(given));
}
