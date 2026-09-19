import type { PieceId, SizeId } from '@/lib/domain/ids';

import type { AvailabilityStatus } from '../schemas/availability.schema';
import type { SizeOption } from '../schemas/product-detail.schema';
import { unifiedSizeOf, type SizedProduct, type SizeSelection } from './size-selection';

/**
 * MOD-04 — pure, React-free. §28.3's saved sizes applied to a product page's
 * size choice: "stored and pre-filling the size selector".
 *
 * The saved sizes arrive as size IDS, one per size set at most. A size id names
 * one size of ONE size set (§6.1 `Piece.size_set_id`), so a piece is matched to
 * a saved size by its own size list alone: a kameez cut to the clothing chart
 * finds the saved clothing size, a shalwar cut to a waist chart would find the
 * saved waist, and neither can take the other's. Nothing here decides which size
 * is saved or which set it belongs to — that is the backend's (DATA-13) — and
 * nothing here adds anything to the bag: a pre-filled choice is a choice, and
 * Add to bag is still the customer's press.
 */

/** The live overlay's status for one `(piece, size)` pair; `null` when not known. */
export type StatusOf = (pieceId: PieceId, sizeId: SizeId) => AvailabilityStatus | null;

/** The customer's saved size among one selector's sizes, or `null` when none of them is. */
export function savedSizeIn(
  sizes: readonly SizeOption[],
  savedSizeIds: readonly SizeId[],
): SizeId | null {
  return sizes.find((size) => savedSizeIds.includes(size.id))?.id ?? null;
}

/**
 * The selection a product page opens with: every piece made in a saved size has
 * it chosen — but only when the overlay REPORTED that size in stock for EVERY
 * piece made in it. A set is one purchase (§6.1), so its saved size is chosen
 * whole or not at all.
 *
 * Sold out is not chosen, because an unbuyable pair must never sit in the
 * selection (§7.1). UNKNOWN is not chosen either, although it stays choosable by
 * hand (§30.2): the customer is told a saved size is chosen "when it is in
 * stock", and a size nobody could check is not known to be.
 *
 * And when one piece cannot take the saved size, NO piece is given it. Choosing
 * the others anyway left a set half-sized in the customer's size — the waistcoat
 * blank beside a kameez and shalwar in L — with Add to bag unavailable and a note
 * saying their size had been chosen, when their size is exactly what this set
 * does not have. The unified selector already shows that size sold out, with
 * Notify Me beside it; the pieces are the customer's to size apart.
 *
 * A piece whose chart has NO saved size is simply left for the customer: that is
 * not a size this set lacks, only one the customer has not saved yet.
 */
export function prefilledSelection(
  product: SizedProduct,
  savedSizeIds: readonly SizeId[],
  statusOf: StatusOf,
): SizeSelection {
  const saved = product.pieces.map(
    (piece) => [piece.id, savedSizeIn(piece.sizes, savedSizeIds)] as const,
  );
  const isWhole = saved.every(
    ([pieceId, sizeId]) => sizeId === null || isReportedInStock(statusOf(pieceId, sizeId)),
  );

  return Object.fromEntries(saved.map(([pieceId, sizeId]) => [pieceId, isWhole ? sizeId : null]));
}

function isReportedInStock(status: AvailabilityStatus | null): boolean {
  return status === 'IN_STOCK' || status === 'LOW_STOCK';
}

/** Whether any piece has a size chosen at all. */
export function hasAnySize(selection: SizeSelection): boolean {
  return Object.values(selection).some((sizeId) => sizeId !== null);
}

/**
 * The ONE size a selection comes to, with its label — what "Remember this size"
 * offers. `null` while nothing is chosen, and while the pieces are sized apart:
 * which chart each of several sizes belongs to is the backend's to know, so the
 * interface does not offer to remember two sizes that might be one chart's.
 */
export function chosenSizeOf(product: SizedProduct, selection: SizeSelection): SizeOption | null {
  const sizeId = unifiedSizeOf(product, selection);
  if (sizeId === null) return null;
  return product.pieces.flatMap((piece) => piece.sizes).find((size) => size.id === sizeId) ?? null;
}
