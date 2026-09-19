import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { resetAuth } from '@/lib/mocks/auth-db';
import { backInStockRequestsFor } from '@/lib/mocks/back-in-stock-db';
import { resetCarts } from '@/lib/mocks/bag-db';
import { resetReservations } from '@/lib/mocks/bag-reservations';
import { handlers } from '@/lib/mocks/handlers';
import { availableKeys, holdUnits, stockedProduct } from '@/lib/mocks/stock-test-support';

import { backInStockRequestSchema, type BackInStockRequest } from '../schemas/back-in-stock.schema';
import { backInStockFailureStatus, requestBackInStock } from './back-in-stock-server';

/**
 * §28.2's Notify Me below the Route Handler: the real API client, its schema
 * check, and the mock backend at the HTTP layer (TEST-04). What it pins is the
 * part a store test cannot reach — that the ACCOUNT travels as a header and is
 * honoured over the body, and that both sides of the Result arrive (TEST-05).
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
  resetAuth();
});

/** A request for the first size of a SIMPLE product, which is sold out unless `inStock`. */
function requestFor(email: string | null, inStock = false): BackInStockRequest {
  const record = stockedProduct('SIMPLE');
  const [key] = availableKeys(record);
  if (key === undefined) throw new Error('Expected a size to ask about.');
  if (!inStock) holdUnits([key]);

  return backInStockRequestSchema.parse({
    productId: record.id,
    pieceId: key.pieceId,
    sizeId: key.sizeId,
    email,
  });
}

describe('requestBackInStock', () => {
  it('records a guest’s address, in the language asked for', async () => {
    const result = await requestBackInStock(requestFor('api.guest@example.com'), {
      accountKey: null,
      locale: 'ur',
    });

    expect(result).toEqual({ ok: true, value: { kind: 'RECORDED' } });
    expect(backInStockRequestsFor('api.guest@example.com')).toMatchObject([{ locale: 'ur' }]);
  });

  it('writes to the signed-in account’s own address, sent as a header rather than in the body', async () => {
    const result = await requestBackInStock(requestFor('typed.instead@example.com'), {
      accountKey: 'customer@example.com',
      locale: 'en',
    });

    expect(result).toEqual({ ok: true, value: { kind: 'RECORDED' } });
    expect(backInStockRequestsFor('customer@example.com')).toHaveLength(1);
    expect(backInStockRequestsFor('typed.instead@example.com')).toEqual([]);
  });

  it('answers IN_STOCK as a value, not a failure', async () => {
    const result = await requestBackInStock(requestFor('api.stocked@example.com', true), {
      accountKey: null,
      locale: 'en',
    });

    expect(result).toEqual({ ok: true, value: { kind: 'IN_STOCK' } });
  });

  it('reports a size the store does not sell as NOT_FOUND', async () => {
    const request = { ...requestFor('api.unknown@example.com'), productId: crypto.randomUUID() };

    const result = await requestBackInStock(backInStockRequestSchema.parse(request), {
      accountKey: null,
      locale: 'en',
    });

    expect(result).toMatchObject({ ok: false, error: { kind: 'NOT_FOUND' } });
  });

  it('reports a backend that cannot be reached as a value', async () => {
    server.use(http.post(`*${ENDPOINTS.backInStock.requests}`, () => HttpResponse.error()));

    const result = await requestBackInStock(requestFor('api.offline@example.com'), {
      accountKey: null,
      locale: 'en',
    });

    expect(result).toMatchObject({ ok: false, error: { kind: 'NETWORK' } });
  });

  /*
   * FORM-04 — the backend's own address rule can refuse what the storefront's
   * check let through. That refusal is the customer's to fix, so it must arrive
   * as VALIDATION (the contract's 422) and not as a server fault.
   */
  it('reports an address the backend will not write to as VALIDATION', async () => {
    const refused: BackInStockRequest = { ...requestFor(null), email: 'not an address' };

    const result = await requestBackInStock(refused, { accountKey: null, locale: 'en' });

    expect(result).toMatchObject({ ok: false, error: { kind: 'VALIDATION' } });
    expect(backInStockRequestsFor('not an address')).toEqual([]);
  });
});

/** What the BFF answers the browser, which reads 400 as "fix the address" (FORM-04). */
describe('backInStockFailureStatus', () => {
  const cases: [string, ApiError, number][] = [
    [
      'a refused address, which goes back on the field',
      { kind: 'VALIDATION', message: 'refused', fieldErrors: {} },
      400,
    ],
    ['a size the store does not sell', { kind: 'NOT_FOUND', message: 'gone' }, 404],
    ['a backend fault', { kind: 'SERVER', message: 'fault', status: 500 }, 502],
    ['a backend that could not be reached', { kind: 'NETWORK', message: 'down' }, 502],
  ];

  it.each(cases)('answers %s', (_case, error, status) => {
    expect(backInStockFailureStatus(error)).toBe(status);
  });
});
