import { beforeEach, describe, expect, it } from 'vitest';

import { cardAvailabilityFor, productAvailabilityFor } from './availability-db';
import { addItem, createCart, removeLine, resetCarts } from './bag-db';
import { resetReservations } from './bag-reservations';
import { CATALOGUE } from './catalogue-db';
import { toProductDetail } from './product-detail-db';
import { availableKeys, holdUnits, stockedProduct, takeEveryUnitOf } from './stock-test-support';

/**
 * §8.2's overlays, answered from ONE ledger.
 *
 * BUG-04 and BUG-05: the card overlay read a fixed flag on the catalogue record
 * and skipped every eleventh product, while the product page subtracted live
 * holds from the stock ledger. So a SET with one piece gone read "sold out" on
 * its page and nothing at all on its card, and taking the last unit of a size
 * flipped the page and never the card. These pin that a card and its page are
 * the same answer, at rest and after stock moves.
 */

function cardFor(productId: string, locale: 'en' | 'ur' = 'en') {
  const [card] = cardAvailabilityFor([productId], locale);
  if (card === undefined) throw new Error(`Expected a card overlay for ${productId}.`);
  return card;
}

function pageStatusOf(productId: string) {
  return productAvailabilityFor(productId, 'en')?.status;
}

beforeEach(() => {
  resetCarts();
  resetReservations();
});

describe('a card and its product page', () => {
  it.each(CATALOGUE.map((record) => [record.code, record.id] as const))(
    'agree about %s at rest',
    (_code, productId) => {
      expect(cardFor(productId).status).toBe(pageStatusOf(productId));
    },
  );

  it('answers for every product the store holds — no fixture gap leaves a card saying nothing', () => {
    expect(cardAvailabilityFor(null, 'en').map((card) => card.productId)).toEqual(
      CATALOGUE.map((record) => record.id),
    );
  });

  it('invents nothing for an id the store does not hold', () => {
    expect(cardAvailabilityFor(['7d1f0a2c-9b4e-4c8a-8f21-999999999999'], 'en')).toEqual([]);
  });
});

describe('the card follows the stock ledger', () => {
  it('flips to SOLD_OUT, with its page, once every size is reserved', () => {
    const record = stockedProduct('SIMPLE');
    expect(cardFor(record.id).status).not.toBe('SOLD_OUT');

    takeEveryUnitOf(record);

    expect(cardFor(record.id).status).toBe('SOLD_OUT');
    expect(pageStatusOf(record.id)).toBe('SOLD_OUT');
  });

  it('comes back when a customer lets the last units go', () => {
    const record = stockedProduct('SIMPLE');
    const [kept, ...rest] = availableKeys(record);
    if (kept === undefined) throw new Error('Expected a stocked size.');
    holdUnits(rest);

    const cartId = createCart();
    const added = addItem(cartId, record.id, [kept], kept.quantity, 'en');
    if (added.kind !== 'ADDED') throw new Error('Expected the last size to be addable.');
    expect(cardFor(record.id).status).toBe('SOLD_OUT');

    const [line] = added.summary.lines;
    if (line === undefined) throw new Error('Expected the added line.');
    removeLine(cartId, line.id, 'en');

    expect(cardFor(record.id).status).not.toBe('SOLD_OUT');
    expect(pageStatusOf(record.id)).toBe(cardFor(record.id).status);
  });

  it('reads LOW_STOCK, with its page, when few sizes are left', () => {
    const record = stockedProduct('SIMPLE');
    const keys = availableKeys(record);

    holdUnits(keys.slice(2));

    expect(cardFor(record.id).status).toBe('LOW_STOCK');
    expect(pageStatusOf(record.id)).toBe('LOW_STOCK');
  });

  it('names the piece of a SET that is gone, in the language asked for', () => {
    const record = stockedProduct('SET');
    const pieces = toProductDetail(record, 'en').pieces;
    const [, second] = pieces;
    if (second === undefined) throw new Error('Expected a SET to have a second piece.');

    holdUnits(availableKeys(record).filter((key) => key.pieceId === second.id));

    const urdu = toProductDetail(record, 'ur').pieces.find((piece) => piece.id === second.id);
    expect(cardFor(record.id).status).toBe('SOLD_OUT');
    expect(cardFor(record.id).unavailablePieceNames).toEqual([second.name]);
    expect(cardFor(record.id, 'ur').unavailablePieceNames).toEqual([urdu?.name]);
  });
});
