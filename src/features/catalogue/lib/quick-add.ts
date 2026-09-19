import type { PieceId, SizeId } from '@/lib/domain/ids';

import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { ProductDetail } from '../schemas/product-detail.schema';
import { sharedSizesOf, unifiedSizeStatus } from './size-selection';

/**
 * MOD-04 — pure, React-free. Reduces a product's per-piece sizes to the ONE
 * unified list a catalogue card offers.
 *
 * §28.2 gives the card a quick add, and the operator's decision is that a card
 * always sells the product as a single entity: one size, applied to every piece
 * of the garment. The per-piece override panel still exists — it is the product
 * page's job (§6.1) — but a grid tile is not where someone sizes a waistcoat
 * differently from its shalwar.
 *
 * That makes "which sizes can I offer?" a real question for a SET, and the
 * answer is the INTERSECTION: a size is offerable only if every sized piece is
 * made in it. Offering M because the kameez has one, when the shalwar does not,
 * produces an add that the §7.1 transaction refuses — a button that looks live
 * and fails.
 */

export interface QuickAddSize {
  id: SizeId;
  label: string;
  /**
   * Whether every piece of the product can be reserved in this size.
   *
   * §30.2: an unknown availability is NOT sold out. When the overlay could not
   * be read the size stays offerable and the backend refuses the add if it must
   * — the frontend never invents a sold-out state it was not told about.
   */
  isAvailable: boolean;
}

/**
 * TS-06 — what a card can offer, as two shapes rather than one with a quiet
 * empty case.
 *
 * `SIZED`: a size is chosen and applied to `pieceIds`, the pieces that HAVE a
 * size set. `ONE_SIZE`: no piece has one (§6.1, `size_set_id` null) — a
 * one-piece unstitched length — so there is nothing to choose and the tray
 * offers the add itself. It used to be an empty `sizes` list, which drew a tray
 * with nothing in it and no way to buy the product from its card.
 */
export type QuickAddOffer =
  | { kind: 'SIZED'; pieceIds: PieceId[]; sizes: QuickAddSize[] }
  | { kind: 'ONE_SIZE'; isAvailable: boolean };

/**
 * Sizes present on EVERY sized piece, in the order the first one lists them.
 *
 * The rule is `size-selection.ts`'s, shared with the product page's unified
 * selector (PD-01), so a tile and its page cannot offer a product in different
 * sizes or disagree about which of them can be bought.
 */
export function unifiedSizesFor(
  product: ProductDetail,
  availability: ProductDetailAvailability | null,
): QuickAddOffer {
  const sized = product.pieces.filter((piece) => piece.sizes.length > 0);

  // DATA-13: the backend's verdict for the product; unknown is not sold out (§30.2).
  if (sized.length === 0) {
    return { kind: 'ONE_SIZE', isAvailable: availability?.status !== 'SOLD_OUT' };
  }

  const sizes = sharedSizesOf(product).map((size): QuickAddSize => ({
    id: size.id,
    label: size.label,
    // Unknown ⇒ still offerable (§30.2): only a reported sold-out piece refuses.
    isAvailable: unifiedSizeStatus(product, availability, size.id) !== 'SOLD_OUT',
  }));

  return { kind: 'SIZED', pieceIds: sized.map((piece) => piece.id), sizes };
}

/**
 * The `{piece -> size}` pairs a card's add sends (§16), for the offer it was
 * shown.
 *
 * The operator's rule, made concrete: a card sells the product as ONE entity, so
 * the chosen size is applied to every piece that has a size set. A three-piece
 * suit still reserves three rows (§7.1) — the customer just does not size them
 * apart from a grid tile. A piece with no size set is not named at all; the
 * backend resolves its key (§7.1 step 1), so a one-size product sends none.
 */
export function quickAddSelections(
  offer: QuickAddOffer,
  sizeId: SizeId | null,
): { pieceId: PieceId; sizeId: SizeId }[] {
  if (offer.kind === 'ONE_SIZE' || sizeId === null) return [];
  return offer.pieceIds.map((pieceId) => ({ pieceId, sizeId }));
}
