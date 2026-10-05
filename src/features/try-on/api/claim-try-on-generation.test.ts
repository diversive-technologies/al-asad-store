import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';
import { productIdSchema } from '@/lib/domain/ids';

import { tryOnResultSchema } from '../schemas/try-on.schema';
import { claimTryOnGeneration, DEFAULT_RETRY_AFTER_SECONDS } from './claim-try-on-generation';

/**
 * T-02 — the claim, at the HTTP boundary (TEST-04): the real client runs, and
 * Java's answer is chosen per test. What matters is that Java's NO is passed on
 * as a 429 with its own `Retry-After`, and that anything that is not a clear YES
 * refuses — an unreachable Java must never mean "go ahead".
 */

const CLAIMS = `*${ENDPOINTS.tryOn.claim}`;
const PRODUCT = productIdSchema.parse('00000000-0000-4000-8000-00000000a001');

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => {
  server.close();
});

function requestFrom(address: string | null): Request {
  return new Request('https://store.test/api/try-on?productId=x', {
    method: 'POST',
    headers: address === null ? {} : { 'x-forwarded-for': address },
  });
}

const ALLOWED = () =>
  HttpResponse.json({ verdict: 'ALLOWED', claimId: '00000000-0000-4000-8000-00000000c001' });

describe('claimTryOnGeneration — allowed', () => {
  it('lets the request proceed (null) when Java says ALLOWED', async () => {
    server.use(http.post(CLAIMS, ALLOWED));

    await expect(claimTryOnGeneration(requestFrom('203.0.113.9'), PRODUCT)).resolves.toBeNull();
  });

  it('sends the product id and the customer’s address, and nothing else', async () => {
    const seen: { body: unknown; address: string | null }[] = [];
    server.use(
      http.post(CLAIMS, async ({ request }) => {
        seen.push({ body: await request.json(), address: request.headers.get('x-client-ip') });
        return ALLOWED();
      }),
    );

    await claimTryOnGeneration(requestFrom('203.0.113.9, 10.0.0.1'), PRODUCT);

    expect(seen).toEqual([{ body: { productId: PRODUCT }, address: '203.0.113.9' }]);
  });
});

describe('claimTryOnGeneration — refused by Java', () => {
  it.each([
    ['this address has had its hour’s share', 'VISITOR_EXHAUSTED', '1200'],
    ['the store has had its day’s share', 'DAILY_CAP_REACHED', '27000'],
  ])('passes a 429 on with Java’s own Retry-After when %s', async (_label, verdict, retryAfter) => {
    server.use(
      http.post(CLAIMS, () =>
        HttpResponse.json({ verdict }, { status: 429, headers: { 'Retry-After': retryAfter } }),
      ),
    );

    const response = await claimTryOnGeneration(requestFrom('203.0.113.9'), PRODUCT);

    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBe(retryAfter);
    expect(response?.headers.get('Cache-Control')).toBe('no-store');
    // Which ceiling was met is the store's business, not the customer's (ERR-11).
    await expect(response?.text()).resolves.toBe('');
  });

  it('says to wait an hour when Java sent no Retry-After', async () => {
    server.use(http.post(CLAIMS, () => new HttpResponse(null, { status: 429 })));

    const response = await claimTryOnGeneration(requestFrom(null), PRODUCT);

    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBe(String(DEFAULT_RETRY_AFTER_SECONDS));
  });
});

describe('claimTryOnGeneration — when the claim cannot be made, the generation is refused', () => {
  it.each([
    ['Java unreachable', () => HttpResponse.error()],
    ['Java failing', () => new HttpResponse(null, { status: 500 })],
    ['Java unavailable', () => new HttpResponse(null, { status: 503 })],
    ['Access refusing this server’s token', () => new HttpResponse(null, { status: 403 })],
    ['an unknown route', () => new HttpResponse(null, { status: 404 })],
    ['a 200 that is not ALLOWED', () => HttpResponse.json({ verdict: 'MAYBE', claimId: 'x' })],
    ['a 200 with no claim id', () => HttpResponse.json({ verdict: 'ALLOWED' })],
    ['a 200 with no body', () => new HttpResponse(null, { status: 200 })],
  ])('answers UNAVAILABLE, never null, for %s', async (_label, respond) => {
    server.use(http.post(CLAIMS, respond));

    const response = await claimTryOnGeneration(requestFrom('203.0.113.9'), PRODUCT);

    expect(response).not.toBeNull();
    expect(response?.status).toBe(200);
    // It is the contract's own answer, which the panel already says in words.
    const answer = tryOnResultSchema.parse(await response?.json());
    expect(answer).toEqual({ status: 'UNAVAILABLE', reason: 'PROVIDER_FAILED' });
  });

  it('logs the failure once, without a photograph or a customer in it', async () => {
    server.use(http.post(CLAIMS, () => HttpResponse.error()));

    await claimTryOnGeneration(requestFrom('203.0.113.9'), PRODUCT);

    expect(console.error).toHaveBeenCalledWith(
      '[api:try-on:claim] NETWORK: The store could not be reached.',
    );
  });
});
