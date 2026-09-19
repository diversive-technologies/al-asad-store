import { ONE_SIZE } from './product-content-db';
import type { ProductDetailPayload } from './product-detail-db';

/** One piece's key, as the cart holds it and Inventory reserves it (§13). */
export interface PieceSelection {
  readonly pieceId: string;
  readonly sizeId: string;
}

/**
 * D1 — §16's first invariant, as the cart module checks it: "A line cannot exist
 * without a size selected for every piece of its product" — and §7.1's first
 * step, "resolve the piece/size keys for every piece of the product".
 *
 * Only the backend knows how many pieces a product has and which sizes each one
 * is cut in, so only the backend can check it. The cover passes when it names
 * every piece that HAS a size set exactly once, each in a size that piece is
 * actually offered in, and names nothing else.
 *
 * A piece with NO size set (§6.1, `size_set_id` null) has nothing for a customer
 * to choose, so the request does not name it, and naming it is refused. Its key
 * is resolved here instead, as its one size (`ONE_SIZE`) — which is what lets a
 * one-piece unstitched length be added at all. It used to be unreachable: the
 * interface sent an empty size id the contract refused, and there was no stock
 * row to reserve against had it got through.
 *
 * The answer is every piece's key in the product's own order, or `null` when the
 * cover is refused. The size half used to be missing: an unknown size id went on
 * to reserve against a stock row that does not exist, and came back UNAVAILABLE
 * naming a size with no label — a refusal the contract itself rejects.
 */
export function resolveSelections(
  detail: ProductDetailPayload,
  selections: readonly PieceSelection[],
): PieceSelection[] | null {
  const named = new Set(selections.map((selection) => selection.pieceId));
  const sized = detail.pieces.filter((piece) => piece.sizes.length > 0);
  if (selections.length !== sized.length || named.size !== selections.length) return null;

  const resolved = detail.pieces.map((piece): PieceSelection | null => {
    if (piece.sizes.length === 0) {
      return named.has(piece.id) ? null : { pieceId: piece.id, sizeId: ONE_SIZE.id };
    }

    const chosen = selections.find((selection) => selection.pieceId === piece.id);
    const isOffered = piece.sizes.some((size) => size.id === chosen?.sizeId);
    return chosen === undefined || !isOffered ? null : { pieceId: piece.id, sizeId: chosen.sizeId };
  });

  return resolved.every((key) => key !== null) ? resolved : null;
}
