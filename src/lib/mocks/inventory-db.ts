import { CATALOGUE } from './catalogue-db';
import { ONE_SIZE } from './product-content-db';
import { toProductDetail } from './product-detail-db';

/**
 * ## The mock backend's stock ledger — `on_hand`
 *
 * §13 keys inventory on `(piece_id, size)` for every product, SIMPLE or SET
 * alike. This is that table, and it is the ONE place a quantity is decided.
 * Split out of `product-detail-db.ts` (MOD-03), because a product's detail is
 * content and what is on the shelf is Inventory's.
 *
 * It exists because §7.1 cannot be modelled honestly without it. A reservation
 * transaction that guarantees "no oversell under concurrency" needs something
 * to oversell — a status pattern computed on the fly has no number to run out
 * of, so `Unavailable(piece)` could never actually fire and the interface's
 * whole failure path would be untestable in the running store.
 *
 * Every availability read — the product page's per-size overlay, the card
 * overlay, the "In stock only" filter and its count, the best sellers — starts
 * from here and subtracts the same two things (`reservation-ledger.ts`), so the
 * sizes the product page shows sold out, the cards that say so and the sizes
 * the bag will refuse are one fact rather than several rules that agree until
 * someone edits one (PD-01).
 *
 * Quantities stay small on purpose: eight units is enough to add repeatedly,
 * and two is enough that a customer can take the last one and watch the size go
 * sold out.
 */
const LOW_STOCK_AT = 2;
const STOCKED_QUANTITY = 8;

/** The `(piece_id, size)` key of §13, as one string. */
export function stockKey(pieceId: string, sizeId: string): string {
  return `${pieceId}:${sizeId}`;
}

/**
 * DATA-13: "low stock" is a THRESHOLD the operator owns, so it is applied here
 * in the mock backend and the number never crosses the wire (§12 carries no
 * quantity field of any kind).
 */
export function statusForQuantity(quantity: number): 'IN_STOCK' | 'LOW_STOCK' | 'SOLD_OUT' {
  if (quantity <= 0) return 'SOLD_OUT';
  return quantity <= LOW_STOCK_AT ? 'LOW_STOCK' : 'IN_STOCK';
}

/**
 * Built on FIRST USE, not at module load.
 *
 * Filling it eagerly means calling `toProductDetail` while the catalogue
 * modules may still be evaluating, and a request that never touches stock
 * should not pay to build the table.
 */
let stockOnHand: Map<string, number> | null = null;

function stockTable(): Map<string, number> {
  if (stockOnHand !== null) return stockOnHand;

  const table = new Map<string, number>();

  CATALOGUE.forEach((record, productIndex) => {
    toProductDetail(record, 'en').pieces.forEach((piece, pieceIndex) => {
      /*
       * §6.1 — a piece with no size set has ONE stock figure, keyed on its one
       * size. Whether the product was ever received is the whole of it: no
       * pattern of sold-out sizes applies to a size nobody chooses.
       */
      if (piece.sizes.length === 0) {
        table.set(stockKey(piece.id, ONE_SIZE.id), record.isInStock ? STOCKED_QUANTITY : 0);
      }

      piece.sizes.forEach((size, sizeIndex) => {
        // Never received, or one piece of some SETs gone entirely — the case §16 cares about.
        const pieceGone =
          !record.isInStock ||
          (record.type === 'SET' && productIndex % 9 === 4 && pieceIndex === 1);
        // A scattered but fixed pattern, so a screenshot and a bug report agree.
        const soldOut = (productIndex + sizeIndex * 3 + pieceIndex) % 7 === 2;
        const low = (productIndex + sizeIndex) % 5 === 1;

        const quantity = pieceGone || soldOut ? 0 : low ? LOW_STOCK_AT : STOCKED_QUANTITY;
        table.set(stockKey(piece.id, size.id), quantity);
      });
    });
  });

  stockOnHand = table;
  return table;
}

/** `on_hand` for one `(piece, size)`. Unknown keys hold nothing. */
export function onHandFor(pieceId: string, sizeId: string): number {
  return stockTable().get(stockKey(pieceId, sizeId)) ?? 0;
}
