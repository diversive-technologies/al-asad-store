import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { API_HEADERS } from '@/lib/api/headers';

import {
  backInStockRequestSchema,
  type BackInStockOutcome,
  type BackInStockRequest,
} from '../schemas/back-in-stock.schema';
import { backInStockFailureStatus, requestBackInStock } from './back-in-stock-server';

/**
 * §28.2's Notify Me below the Route Handler: the real API client, its schema
 * check, and per-test handlers at the HTTP layer (TEST-04). What it pins is the
 * part only this side owns — that the ACCOUNT travels as a header and the body
 * goes as the customer wrote it, with the language as a parameter — and that
 * both sides of the Result arrive (TEST-05). Which address is written to, and
 * whether the size is sold out, is the backend's answer.
 */

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

const REQUESTS = `*${ENDPOINTS.backInStock.requests}`;

/** What reached the backend, recorded by the handler that answered it. */
interface Sent {
  readonly locale: string | null;
  readonly account: string | null;
  readonly body: unknown;
}

function answering(sink: Sent[], outcome: BackInStockOutcome) {
  return async ({ request }: { request: Request }) => {
    sink.push({
      locale: new URL(request.url).searchParams.get('locale'),
      account: request.headers.get(API_HEADERS.accountKey),
      body: await request.clone().json(),
    });
    return HttpResponse.json(outcome);
  };
}

/** A request about one piece's size, with the address typed into the form. */
function requestFor(email: string | null): BackInStockRequest {
  return backInStockRequestSchema.parse({
    productId: '00000000-0000-4000-8000-00000000b001',
    pieceId: '00000000-0000-4000-8000-00000000b002',
    sizeId: '00000000-0000-4000-8000-00000000b003',
    email,
  });
}

describe('requestBackInStock', () => {
  it('records a guest’s address, in the language asked for', async () => {
    const received: Sent[] = [];
    const request = requestFor('api.guest@example.com');
    server.use(http.post(REQUESTS, answering(received, { kind: 'RECORDED' })));

    const result = await requestBackInStock(request, { accountKey: null, locale: 'ur' });

    expect(result).toEqual({ ok: true, value: { kind: 'RECORDED' } });
    expect(received).toEqual([{ locale: 'ur', account: null, body: request }]);
  });

  it('names the signed-in account in a header, and leaves the body as it was typed', async () => {
    const received: Sent[] = [];
    const request = requestFor('typed.instead@example.com');
    server.use(http.post(REQUESTS, answering(received, { kind: 'RECORDED' })));

    const result = await requestBackInStock(request, {
      accountKey: 'customer@example.com',
      locale: 'en',
    });

    expect(result).toEqual({ ok: true, value: { kind: 'RECORDED' } });
    expect(received).toEqual([{ locale: 'en', account: 'customer@example.com', body: request }]);
  });

  it('answers IN_STOCK as a value, not a failure', async () => {
    server.use(http.post(REQUESTS, answering([], { kind: 'IN_STOCK' })));

    const result = await requestBackInStock(requestFor('api.stocked@example.com'), {
      accountKey: null,
      locale: 'en',
    });

    expect(result).toEqual({ ok: true, value: { kind: 'IN_STOCK' } });
  });

  /*
   * FORM-04 — the backend's own address rule can refuse what the storefront's
   * check let through. That refusal is the customer's to fix, so it must arrive
   * as VALIDATION (the contract's 422) and not as a server fault. A size the store
   * does not sell is the contract's 404.
   */
  it.each([
    ['a size the store does not sell', 404, 'NOT_FOUND'],
    ['an address the backend will not write to', 422, 'VALIDATION'],
  ])('reports %s as %s', async (_label, status, kind) => {
    server.use(http.post(REQUESTS, () => new HttpResponse(null, { status })));

    const result = await requestBackInStock(requestFor('api.refused@example.com'), {
      accountKey: null,
      locale: 'en',
    });

    expect(result).toMatchObject({ ok: false, error: { kind } });
  });

  it('reports a backend that cannot be reached as a value', async () => {
    server.use(http.post(REQUESTS, () => HttpResponse.error()));

    const result = await requestBackInStock(requestFor('api.offline@example.com'), {
      accountKey: null,
      locale: 'en',
    });

    expect(result).toMatchObject({ ok: false, error: { kind: 'NETWORK' } });
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
