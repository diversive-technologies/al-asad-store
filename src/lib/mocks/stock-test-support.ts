import { productAvailabilityFor } from './availability-db';
import { reserve } from './bag-reservations';
import { createCart } from './cart-store';
import { CATALOGUE, type CatalogueRecord } from './catalogue-db';
import { ONE_SIZE } from './product-content-db';
import { toProductDetail } from './product-detail-db';
import { availableQuantity } from './reservation-ledger';

/**
 * Test support for the stock ledger — not a test file, and imported only by
 * tests. It drives the ledger through the SAME §7.1 transaction a bag uses, so a
 * test that empties a shelf empties it the way a customer would.
 */

/** The first product of this type sold by SIZE that can be bought right now. */
export function stockedProduct(type: 'SIMPLE' | 'SET'): CatalogueRecord {
  const record = CATALOGUE.find(
    (entry) =>
      entry.type === type &&
      entry.garmentType === 'stitched' &&
      productAvailabilityFor(entry.id, 'en')?.status !== 'SOLD_OUT',
  );
  if (record === undefined) throw new Error(`No ${type} product in the fixture can be bought.`);
  return record;
}

/** Every `(piece, size)` of a product with units still to be had, and how many. */
export function availableKeys(
  record: CatalogueRecord,
): { pieceId: string; sizeId: string; quantity: number }[] {
  return toProductDetail(record, 'en').pieces.flatMap((piece) =>
    // A piece with no size set is held on its one size (§6.1).
    (piece.sizes.length === 0 ? [ONE_SIZE] : piece.sizes)
      .map((size) => ({
        pieceId: piece.id,
        sizeId: size.id,
        quantity: availableQuantity(piece.id, size.id),
      }))
      .filter((key) => key.quantity > 0),
  );
}

/** Holds the given units in somebody else's bag, one hold per key. */
export function holdUnits(
  keys: readonly { pieceId: string; sizeId: string; quantity: number }[],
): void {
  const cartId = createCart();
  keys.forEach((key, index) => {
    const outcome = reserve(cartId, `line-${String(index)}`, [key]);
    if (outcome.kind !== 'RESERVED') throw new Error('Expected the units to be free to hold.');
  });
}

/** Holds every unit of every size of every piece, as other customers' bags would. */
export function takeEveryUnitOf(record: CatalogueRecord): void {
  holdUnits(availableKeys(record));
}
