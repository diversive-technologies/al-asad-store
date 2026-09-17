import 'server-only';

import { fetchProduct } from '@/features/catalogue';
import type { Locale } from '@/i18n/locales';
import { logApiError } from '@/lib/utils/log';

import type { StudioProduct } from '../lib/studio-product';

const CONTEXT = 'made-to-measure';

/**
 * The product a `?product=` address names, or nothing.
 *
 * STRUCT-04 — through the catalogue's public barrel, the way the wishlist reads
 * products it holds only the ids of. The studio does not own the catalogue and
 * does not duplicate its read (PD-01).
 *
 * **It answers with a VALUE rather than a `Result`, and that is a decision about
 * what the studio is.** `/stitched` is a public page that works without buying
 * anything: a product that cannot be read, no longer exists, or is not cut to
 * measure leaves the customer in the studio they asked for, able to measure and
 * save, rather than on an error page. What is lost is the banner and the way
 * into the bag — an offer, not the page.
 *
 * That is the same forgiving shape as `savedProfilesFor`, and the same caution
 * applies: it is safe only while nothing REPORTS the absence as a fact about the
 * customer's product. Nothing does — the studio simply does not mention one — and
 * a screen that wanted to say "we could not load your garment" would need this to
 * say which of the three it was, rather than deciding for it here.
 *
 * ERR-10 — a failed READ is logged once, at the boundary. A 404 and a product
 * with no offer are not: following a stale link is an ordinary thing a person
 * does, not a fault.
 */
export async function tailoredProduct(
  slug: string | null,
  locale: Locale,
): Promise<StudioProduct | null> {
  if (slug === null) return null;

  const read = await fetchProduct(slug, locale);
  if (!read.ok) {
    logApiError(CONTEXT, read.error);
    return null;
  }

  const product = read.value;
  if (product === null) return null;

  /* DATA-13 — WHICH garments the workshop cuts is the backend's declaration. A
     product with no offer is not a defect and not an error, so it is not logged
     either: it is a product the workshop does not cut, reached by an edited or
     outdated address exactly as a 404 is. */
  if (product.stitching === null) return null;

  const [first] = product.media;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    /* `media` is `.min(1)`, so a product always has one photograph; the fallback
       satisfies `noUncheckedIndexedAccess` rather than describing a real state. */
    imageUrl: first?.url ?? '',
    imageAlt: first?.alt ?? '',
    garmentStyle: product.stitching.garmentStyle,
  };
}
