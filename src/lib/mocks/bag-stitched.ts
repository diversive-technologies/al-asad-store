import type { Locale } from '@/i18n/locales';

import { summaryFor, type BagSummaryPayload } from './bag-projection';
import { activeLines, mockId, type CartLineRecord, type CartRecord } from './cart-store';
import type { CatalogueRecord } from './catalogue-db';
import { toProductDetail } from './product-detail-db';
import { profileById, type ProfileOwnerRow } from './profiles-db';

/**
 * D1 — §34.8's cut line: a garment made to measure, added to the bag. Split out
 * of `bag-db.ts` (MOD-03), where `addItem` hands it every add that names a
 * profile. It takes no reservation — there is no size off a shelf and no cloth
 * in the fixture to hold — so nothing here reaches §7.1.
 */

/** What a cut line's add can answer — a subset of `addItem`'s. */
export type StitchedAddResult =
  | { kind: 'ADDED'; summary: BagSummaryPayload }
  | { kind: 'NOT_FOUND' }
  | { kind: 'MEASUREMENTS_REFUSED' };

/**
 * A garment to be cut, added to the bag.
 *
 * The line is merged on (product, PROFILE), so asking for a second kameez to the
 * same figures raises the quantity rather than making a second line — and asking
 * for one to DIFFERENT figures makes its own line, because it is a different
 * garment however alike the two look.
 *
 * A profile that is unknown, not this owner's, or taken for a different garment
 * than the product is cut as is MEASUREMENTS_REFUSED — never NOT_FOUND. That one
 * means "no such cart", and the BFF answers it by throwing the cart cookie away
 * and starting a new cart, which is exactly wrong for a cart that is fine.
 */
export function addStitched(
  cartId: string,
  cart: CartRecord,
  record: CatalogueRecord,
  stitchingProfileId: string,
  stitchingOwner: ProfileOwnerRow | null,
  quantity: number,
  locale: Locale,
): StitchedAddResult {
  /*
   * WHOSE measurements, before anything else. The id comes from a browser and
   * what it buys is cloth cut to those figures, so "does this exist" is not the
   * question — "is it yours" is. No owner at all is no.
   */
  if (stitchingOwner === null) return { kind: 'MEASUREMENTS_REFUSED' };
  const profile = profileById(stitchingProfileId, stitchingOwner);
  if (profile === null) return { kind: 'MEASUREMENTS_REFUSED' };

  /*
   * And WHETHER THIS GARMENT is cut at all, and as what.
   *
   * \`STITCHING_STYLE\` is the backend's declaration — a boy's kurta maps to null
   * deliberately, because every served bound is an adult's. Without this a
   * kameez profile could be attached to a waistcoat suit, and the line would
   * have been priced from the kameez's charge with the kameez's figures sent to
   * the workshop. It is the same check \`addItem\` makes for sizes, for the same
   * reason: only the backend knows what the product is.
   */
  const offer = toProductDetail(record, locale).stitching;
  if (offer === null || offer.garmentStyle !== profile.garmentStyle) {
    return { kind: 'MEASUREMENTS_REFUSED' };
  }

  const productId = record.id;
  const existing = activeLines(cart).find(
    (line) => line.productId === productId && line.stitchingProfileId === stitchingProfileId,
  );

  const line: CartLineRecord = existing ?? {
    id: mockId('0002'),
    productId,
    selections: [],
    quantity: 0,
    removedAt: null,
    removalReason: null,
    stitchingProfileId,
    stitchingOwner,
  };

  line.quantity += quantity;
  if (existing === undefined) cart.lines.push(line);

  const summary = summaryFor(cartId, locale);
  return summary === null ? { kind: 'NOT_FOUND' } : { kind: 'ADDED', summary };
}
