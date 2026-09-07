import type { PieceId, SizeId } from '@/lib/domain/ids';

import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { ProductDetail } from '../schemas/product-detail.schema';

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
 * answer is the INTERSECTION: a size is offerable only if every piece is made
 * in it. Offering M because the kameez has one, when the shalwar does not,
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

export interface QuickAddOffer {
  pieceIds: PieceId[];
  sizes: QuickAddSize[];
}

/** Sizes present on EVERY piece, in the order the first piece lists them. */
export function unifiedSizesFor(
  product: ProductDetail,
  availability: ProductDetailAvailability | null,
): QuickAddOffer {
  const [first, ...rest] = product.pieces;
  if (first === undefined) return { pieceIds: [], sizes: [] };

  const shared = first.sizes.filter((size) =>
    rest.every((piece) => piece.sizes.some((entry) => entry.id === size.id)),
  );

  const sizes = shared.map((size): QuickAddSize => {
    const isAvailable = product.pieces.every((piece) => {
      const pieceStatus = availability?.pieces.find((entry) => entry.pieceId === piece.id);
      // Unknown ⇒ still offerable (§30.2), so `undefined` is not a refusal.
      if (pieceStatus === undefined) return true;

      const sizeStatus = pieceStatus.sizes.find((entry) => entry.sizeId === size.id);
      if (sizeStatus === undefined) return true;

      return sizeStatus.status !== 'SOLD_OUT';
    });

    return { id: size.id, label: size.label, isAvailable };
  });

  return { pieceIds: product.pieces.map((piece) => piece.id), sizes };
}
