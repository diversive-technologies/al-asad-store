import { beforeEach, describe, expect, it } from 'vitest';

import { register, resetAuth } from './auth-db';
import {
  backInStockRequestsFor,
  requestBackInStock,
  type BackInStockAsk,
} from './back-in-stock-db';
import { resetCarts } from './bag-db';
import { resetReservations } from './bag-reservations';
import type { CatalogueRecord } from './catalogue-db';
import { availableKeys, holdUnits, stockedProduct } from './stock-test-support';

/**
 * §28.2's Notify Me, as the stand-in for Java records it.
 *
 * Every test writes under its OWN address. The store is append-only and has no
 * way to forget a row (D6), so isolation comes from distinct addresses rather
 * than from a reset — the saved items' tests do the same with accounts. The
 * stock ledger IS reset, because selling a size out is how each test sets up.
 */

type StockKey = ReturnType<typeof availableKeys>[number];

beforeEach(() => {
  resetCarts();
  resetReservations();
  resetAuth();
});

function ask(fields: Pick<BackInStockAsk, 'productId' | 'sizeId'> & Partial<BackInStockAsk>) {
  return { pieceId: null, email: null, accountKey: null, locale: 'en' as const, ...fields };
}

/** A size EVERY sizeable piece of the product can still be had in, with each piece's key. */
function sizeInStockAcrossPieces(record: CatalogueRecord): StockKey[] {
  const keys = availableKeys(record);
  const pieces = new Set(keys.map((key) => key.pieceId));
  const sizeId = keys.find(
    (key) => keys.filter((other) => other.sizeId === key.sizeId).length === pieces.size,
  )?.sizeId;
  return keys.filter((key) => key.sizeId === sizeId);
}

/** A SET with ONE piece sold out in a size every other piece still has. */
function setWithOnePieceSoldOut(): { record: CatalogueRecord; held: StockKey; others: StockKey[] } {
  const record = stockedProduct('SET');
  const [held, ...others] = sizeInStockAcrossPieces(record);
  if (held === undefined) throw new Error('Expected a size every piece is sold in.');
  holdUnits([held]);
  return { record, held, others };
}

/** The first size of a SIMPLE product, sold out the way customers would: every unit held. */
function soldOutSimpleKey(): { record: CatalogueRecord; key: StockKey } {
  const record = stockedProduct('SIMPLE');
  const [key] = availableKeys(record);
  if (key === undefined) throw new Error('Expected a size to sell out.');
  holdUnits([key]);
  return { record, key };
}

describe('a request to be emailed when a size is back', () => {
  it('records a guest’s address for a sold-out size, trimmed and lower-cased', () => {
    const { record, key } = soldOutSimpleKey();

    const answer = requestBackInStock(
      ask({
        productId: record.id,
        pieceId: key.pieceId,
        sizeId: key.sizeId,
        email: ' Guest.One@Example.COM ',
      }),
    );

    expect(answer).toEqual({ kind: 'RECORDED' });
    expect(backInStockRequestsFor('guest.one@example.com')).toMatchObject([
      {
        pieceId: key.pieceId,
        sizeId: key.sizeId,
        email: 'guest.one@example.com',
        accountKey: null,
      },
    ]);
  });

  it('adds nothing when the same address asks again, says so, and keeps the first request’s date', () => {
    const { record, key } = soldOutSimpleKey();
    const same = ask({ productId: record.id, sizeId: key.sizeId, email: 'twice@example.com' });

    requestBackInStock(same, new Date('2026-09-01T10:00:00.000Z'));
    const again = requestBackInStock(
      { ...same, email: 'TWICE@example.com' },
      new Date('2026-09-02T10:00:00.000Z'),
    );

    expect(again).toEqual({ kind: 'ALREADY_RECORDED' });
    expect(backInStockRequestsFor('twice@example.com')).toMatchObject([
      { recordedAt: '2026-09-01T10:00:00.000Z' },
    ]);
  });

  it('treats another address for the same size as a request of its own', () => {
    const { record, key } = soldOutSimpleKey();
    requestBackInStock(
      ask({ productId: record.id, sizeId: key.sizeId, email: 'first@example.com' }),
    );

    const other = requestBackInStock(
      ask({ productId: record.id, sizeId: key.sizeId, email: 'second@example.com' }),
    );

    expect(other).toEqual({ kind: 'RECORDED' });
  });

  it('refuses a size that can be bought, and records nothing', () => {
    const record = stockedProduct('SIMPLE');
    const [key] = availableKeys(record);

    const answer = requestBackInStock(
      ask({ productId: record.id, sizeId: key?.sizeId ?? '', email: 'in.stock@example.com' }),
    );

    expect(answer).toEqual({ kind: 'IN_STOCK' });
    expect(backInStockRequestsFor('in.stock@example.com')).toEqual([]);
  });

  it.each([
    ['a product the store does not hold', { productId: '7d1f0a2c-9b4e-4c8a-8f21-999999999999' }],
    ['a piece the product does not have', { pieceId: '7d1f0a2c-9b4e-4c8a-8f21-999999999998' }],
    ['a size the product is not sold in', { sizeId: '7d1f0a2c-9b4e-4c8a-8f21-999999999997' }],
  ])('answers nothing — Java’s 404 — for %s', (_case, wrong) => {
    const { record, key } = soldOutSimpleKey();
    const base = ask({ productId: record.id, pieceId: key.pieceId, sizeId: key.sizeId });

    expect(requestBackInStock({ ...base, email: 'nowhere@example.com', ...wrong })).toBeNull();
  });

  it('asks for an address when a guest sends none', () => {
    const { record, key } = soldOutSimpleKey();

    expect(requestBackInStock(ask({ productId: record.id, sizeId: key.sizeId }))).toEqual({
      kind: 'EMAIL_REQUIRED',
    });
  });
});

describe('who the email goes to', () => {
  it('writes to the account’s own address, whatever the body typed', () => {
    const { record, key } = soldOutSimpleKey();

    const answer = requestBackInStock(
      ask({
        productId: record.id,
        sizeId: key.sizeId,
        accountKey: 'customer@example.com',
        email: 'somebody.else@example.com',
      }),
    );

    expect(answer).toEqual({ kind: 'RECORDED' });
    expect(backInStockRequestsFor('customer@example.com')).toMatchObject([
      { accountKey: 'customer@example.com' },
    ]);
    expect(backInStockRequestsFor('somebody.else@example.com')).toEqual([]);
  });

  it('asks an account with no address on file for one, and then takes the one it types', () => {
    const { record, key } = soldOutSimpleKey();
    const byCode = ask({ productId: record.id, sizeId: key.sizeId, accountKey: '03009998887' });

    expect(requestBackInStock(byCode)).toEqual({ kind: 'EMAIL_REQUIRED' });
    expect(requestBackInStock({ ...byCode, email: 'by.code@example.com' })).toEqual({
      kind: 'RECORDED',
    });
    expect(backInStockRequestsFor('by.code@example.com')).toMatchObject([
      { accountKey: '03009998887' },
    ]);
  });

  it('answers a guest typing an account’s address exactly as any other, and never ties the two (§11)', () => {
    const { record, key } = soldOutSimpleKey();
    register({
      fullName: 'Registered',
      email: 'registered@example.com',
      mobile: '03001112223',
      password: 'a-long-passphrase',
    });
    const asked = (email: string) =>
      requestBackInStock(ask({ productId: record.id, sizeId: key.sizeId, email }));

    expect(asked('registered@example.com')).toEqual(asked('stranger@example.com'));
    expect(backInStockRequestsFor('registered@example.com')).toMatchObject([{ accountKey: null }]);
  });
});

describe('a request about a whole SET in one size', () => {
  it('records only the pieces sold out in that size, and then a piece alone is the same request', () => {
    const { record, held, others } = setWithOnePieceSoldOut();
    const whole = ask({
      productId: record.id,
      sizeId: held.sizeId,
      email: 'whole.set@example.com',
    });

    expect(others.length).toBeGreaterThan(0);
    expect(requestBackInStock(whole)).toEqual({ kind: 'RECORDED' });
    expect(backInStockRequestsFor('whole.set@example.com').map((row) => row.pieceId)).toEqual([
      held.pieceId,
    ]);
    expect(requestBackInStock({ ...whole, pieceId: held.pieceId })).toEqual({
      kind: 'ALREADY_RECORDED',
    });
  });

  it('refuses a piece that is still in stock in that size, though its set has one sold out', () => {
    const { record, held, others } = setWithOnePieceSoldOut();
    const [stocked] = others;

    const answer = requestBackInStock(
      ask({
        productId: record.id,
        pieceId: stocked?.pieceId ?? null,
        sizeId: held.sizeId,
        email: 'other.piece@example.com',
      }),
    );

    expect(answer).toEqual({ kind: 'IN_STOCK' });
  });

  it('is in stock when no piece is sold out in that size', () => {
    const record = stockedProduct('SET');
    const [first] = sizeInStockAcrossPieces(record);

    const answer = requestBackInStock(
      ask({ productId: record.id, sizeId: first?.sizeId ?? '', email: 'set.in.stock@example.com' }),
    );

    expect(answer).toEqual({ kind: 'IN_STOCK' });
  });
});
