/**
 * The product the studio was opened from, reduced to what the studio needs.
 *
 * MOD-04 — pure, and deliberately NOT the catalogue's `ProductDetail`. The studio
 * needs four facts: what to call the garment, how to get back to it, which style
 * it is cut as, and the id the bag takes. Carrying the whole projection would
 * hand the studio a description, a delivery date and fourteen size rows it has
 * no business reading, and would make every change to the product contract a
 * change here.
 */

import type { GarmentStyleId, ProductId } from '@/lib/domain/ids';
import type { StyleOffers } from '@/lib/domain/style-offer';

export interface StudioProduct {
  /** What the bag takes; §16 `addItem` is keyed on the id, never the slug. */
  readonly id: ProductId;
  /** The way back to it — the address the customer came from. */
  readonly slug: string;
  readonly name: string;
  /** One photograph, so the customer can see they are measuring for the right one. */
  readonly imageUrl: string;
  readonly imageAlt: string;
  /**
   * The style the WORKSHOP cuts this product as, from the product's own offer.
   *
   * It overrules `?style=` rather than agreeing with it. A garment is cut as one
   * style and Phase 6's add refuses a profile taken for another, so an address
   * carrying a product and a contradicting style would otherwise open a list that
   * could never be added to the bag — a studio that works perfectly and dead-ends.
   */
  readonly garmentStyle: GarmentStyleId;
}

/** Which list the studio opens, and whether a product is still in play. */
export interface SettledStyle {
  readonly style: GarmentStyleId;
  /** The product, once its style is known to be offered; otherwise nothing. */
  readonly product: StudioProduct | null;
  /**
   * The address asked for a style the workshop does not offer, and the page has
   * to say so. Never while a product is in play: the product settled the style,
   * and the banner names the garment instead.
   */
  readonly fellBack: boolean;
  /** A product was read but is cut as a style no longer offered — worth reporting. */
  readonly productDropped: boolean;
}

/**
 * The studio's choice of list, from the offers, the style the address asked for
 * and the product it was opened from.
 *
 * The order of precedence is the whole rule. A product in play settles the style
 * — the workshop cuts a given garment as one style, so `?style=` can only
 * contradict it by an edited address, and obeying the address would open a list
 * the product's own profile could never be added against. Then the style asked
 * for, if it is offered. Then the FIRST style offered, which is the backend's
 * order and never a style named in code (D5).
 *
 * A product whose style is not offered is dropped rather than obeyed: opening a
 * different list under its banner would measure for a garment nobody is buying.
 */
export function settleStudioStyle(
  offers: StyleOffers,
  requested: GarmentStyleId | null,
  product: StudioProduct | null,
): SettledStyle {
  const isOffered = (style: GarmentStyleId | null): boolean =>
    style !== null && offers.some((offer) => offer.garmentStyle === style);

  const inPlay = product !== null && isOffered(product.garmentStyle) ? product : null;
  const asked = isOffered(requested) ? requested : null;

  return {
    style: inPlay?.garmentStyle ?? asked ?? offers[0].garmentStyle,
    product: inPlay,
    fellBack: inPlay === null && requested !== null && asked === null,
    productDropped: product !== null && inPlay === null,
  };
}
