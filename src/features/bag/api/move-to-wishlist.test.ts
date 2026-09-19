import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { cartIdSchema, cartLineIdSchema } from '@/lib/domain/ids';
import { addItem, createCart, removeLine, resetCarts, summaryFor } from '@/lib/mocks/bag-db';
import { resetReservations } from '@/lib/mocks/bag-reservations';
import { handlers } from '@/lib/mocks/handlers';
import { availableKeys, stockedProduct } from '@/lib/mocks/stock-test-support';
import { savedItemsFor } from '@/lib/mocks/wishlist-db';

import { moveToWishlist } from './bag-server';

/**
 * §16 `moveToWishlist` across the HTTP boundary (TEST-04): the real API client
 * and its schema, against the real mock handlers. What the store tests cannot
 * reach is whether what the mock SENDS is what the contract ACCEPTS, and that
 * the account travels in the header and nowhere else.
 */

const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

beforeEach(() => {
  resetCarts();
  resetReservations();
});

/** A cart holding one stock line, with the ids the client addresses them by. */
function cartWithLine() {
  const record = stockedProduct('SIMPLE');
  const bySize = new Map(availableKeys(record).map((key) => [key.pieceId, key.sizeId]));
  const selections = [...bySize.entries()].map(([pieceId, sizeId]) => ({ pieceId, sizeId }));
  const cartId = createCart();
  const outcome = addItem(cartId, record.id, selections, 1, 'en');
  const lineId = outcome.kind === 'ADDED' ? outcome.summary.lines[0]?.id : undefined;
  if (lineId === undefined) throw new Error(`Expected ${record.code} to be addable.`);

  return {
    productId: record.id,
    cartId: cartIdSchema.parse(cartId),
    lineId: cartLineIdSchema.parse(lineId),
  };
}

describe('moveToWishlist through the real client', () => {
  it('parses a move and saves into the account the header named', async () => {
    const account = 'client-moves@example.com';
    const { productId, cartId, lineId } = cartWithLine();

    const result = await moveToWishlist(cartId, lineId, account, 'en');

    expect(result.ok ? result.value.kind : result.error.kind).toBe('MOVED');
    expect(summaryFor(cartId, 'en')?.lines).toEqual([]);
    expect(savedItemsFor(account)).toEqual([productId]);
  });

  it('parses the answer for a line already gone, carrying the bag', async () => {
    const { cartId, lineId } = cartWithLine();
    removeLine(cartId, lineId, 'en');

    const result = await moveToWishlist(cartId, lineId, 'client-gone@example.com', 'en');

    expect(
      result.ok && result.value.kind === 'NOT_IN_BAG' ? result.value.summary.lines : null,
    ).toEqual([]);
  });

  it('is refused without an account, and the line stays in the bag', async () => {
    const { cartId, lineId } = cartWithLine();

    const result = await moveToWishlist(cartId, lineId, '', 'en');

    expect(result.ok ? null : result.error.kind).toBe('UNAUTHORIZED');
    expect(summaryFor(cartId, 'en')?.lines.map((line) => line.id)).toEqual([lineId]);
  });

  it('answers NOT_FOUND only for a cart that is not a bag', async () => {
    const result = await moveToWishlist(
      cartIdSchema.parse(crypto.randomUUID()),
      cartLineIdSchema.parse(crypto.randomUUID()),
      'client-nocart@example.com',
      'en',
    );

    expect(result.ok ? null : result.error.kind).toBe('NOT_FOUND');
  });
});
