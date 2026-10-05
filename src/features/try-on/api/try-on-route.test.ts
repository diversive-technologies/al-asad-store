import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';
import { ok } from '@/lib/result';

import { POST } from '../../../../app/api/try-on/route';

/**
 * T-02 — the Route Handler's ORDER OF WORK, which is what stands between the
 * store and a bill: the claim to Java comes first — before the body is read and
 * before the provider is reached — and a refusal, or a Java that cannot be asked,
 * stops there. The module is replaced by a recorder so a test can say "the
 * provider was never called"; Java's answer is chosen per test at the HTTP layer.
 */

const generate = vi.hoisted(() => vi.fn());
vi.mock('./generate-try-on', () => ({ generateTryOn: generate }));

const events = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics', () => ({ recordRequestEvents: events }));

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: () => undefined }),
  headers: () => Promise.resolve(new Headers()),
}));

const CLAIMS = `*${ENDPOINTS.tryOn.claim}`;
const PRODUCT = '00000000-0000-4000-8000-00000000a001';
const OTHER_PRODUCT = '00000000-0000-4000-8000-00000000a002';

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
beforeEach(() => {
  generate.mockReset();
  events.mockReset();
  events.mockResolvedValue(undefined);
  generate.mockResolvedValue(
    ok({
      status: 'READY',
      image: { dataUrl: 'data:image/jpeg;base64,AAAA', widthPx: 10, heightPx: 10 },
    }),
  );
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => {
  server.close();
});

const allowed = () =>
  HttpResponse.json({ verdict: 'ALLOWED', claimId: '00000000-0000-4000-8000-00000000c001' });

/** A request whose body-reading methods are watched, so "never read" can be asserted. */
function tryOnRequest(query: string, formProduct: string = PRODUCT) {
  const form = new FormData();
  form.set('productId', formProduct);
  form.set('photo', new File([new Uint8Array([1, 2, 3])], 'me.jpg', { type: 'image/jpeg' }));
  const request = new Request(`https://store.test/api/try-on${query}`, {
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.9' },
    body: form,
  });
  const formData = vi.spyOn(request, 'formData');
  return { request, formData };
}

/** M-03 — what the route reports, after the claim and the photograph are accepted. */
describe('POST /api/try-on — behaviour events', () => {
  const recorded = () => events.mock.calls.map((call) => call.slice(1));

  it('reports started then ready for a generation that succeeds', async () => {
    server.use(http.post(CLAIMS, allowed));

    await POST(tryOnRequest(`?productId=${PRODUCT}`).request);

    expect(recorded()).toEqual([
      [{ type: 'try_on_started', path: '/api/try-on', productId: PRODUCT }],
      [{ type: 'try_on_ready', path: '/api/try-on', productId: PRODUCT }],
    ]);
  });

  it('reports failed with the reason when the provider cannot make the image', async () => {
    server.use(http.post(CLAIMS, allowed));
    generate.mockResolvedValue(ok({ status: 'UNAVAILABLE', reason: 'PROVIDER_FAILED' }));

    await POST(tryOnRequest(`?productId=${PRODUCT}`).request);

    expect(recorded().map(([event]) => event.type)).toEqual(['try_on_started', 'try_on_failed']);
    expect(recorded()[1]?.[0]).toMatchObject({ outcome: 'provider_failed' });
  });

  it('reports nothing when Java refuses the claim, so no generation started', async () => {
    server.use(
      http.post(CLAIMS, () => HttpResponse.json({ verdict: 'DAILY_CAP_REACHED' }, { status: 429 })),
    );

    await POST(tryOnRequest(`?productId=${PRODUCT}`).request);

    expect(events).not.toHaveBeenCalled();
  });

  it('reports nothing for a photograph the form refuses', async () => {
    server.use(http.post(CLAIMS, allowed));

    await POST(tryOnRequest(`?productId=${PRODUCT}`, OTHER_PRODUCT).request);

    expect(events).not.toHaveBeenCalled();
  });
});

describe('POST /api/try-on — claim first', () => {
  it('reads the body and generates only after Java says ALLOWED', async () => {
    const order: string[] = [];
    server.use(
      http.post(CLAIMS, () => {
        order.push('claim');
        return allowed();
      }),
    );
    const { request, formData } = tryOnRequest(`?productId=${PRODUCT}`);
    formData.mockImplementation(() => {
      order.push('body');
      return Request.prototype.formData.call(request);
    });
    generate.mockImplementation(() => {
      order.push('generate');
      return Promise.resolve(
        ok({
          status: 'READY',
          image: { dataUrl: 'data:image/jpeg;base64,AAAA', widthPx: 1, heightPx: 1 },
        }),
      );
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(order).toEqual(['claim', 'body', 'generate']);
  });

  it.each([
    ['this address has had its share', 'VISITOR_EXHAUSTED', '900'],
    ['the store has had its day’s share', 'DAILY_CAP_REACHED', '30000'],
  ])(
    'answers 429 with Java’s Retry-After, and never reads the body, when %s',
    async (_l, verdict, retry) => {
      server.use(
        http.post(CLAIMS, () =>
          HttpResponse.json({ verdict }, { status: 429, headers: { 'Retry-After': retry } }),
        ),
      );
      const { request, formData } = tryOnRequest(`?productId=${PRODUCT}`);

      const response = await POST(request);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe(retry);
      expect(formData).not.toHaveBeenCalled();
      expect(generate).not.toHaveBeenCalled();
    },
  );

  it('refuses the generation, with no body read and no provider call, when Java cannot be reached', async () => {
    server.use(http.post(CLAIMS, () => HttpResponse.error()));
    const { request, formData } = tryOnRequest(`?productId=${PRODUCT}`);

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'UNAVAILABLE',
      reason: 'PROVIDER_FAILED',
    });
    expect(formData).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });

  it('claims for the product named in the address', async () => {
    let claimed: unknown = null;
    server.use(
      http.post(CLAIMS, async ({ request }) => {
        claimed = await request.json();
        return allowed();
      }),
    );

    await POST(tryOnRequest(`?productId=${PRODUCT}`).request);

    expect(claimed).toEqual({ productId: PRODUCT });
  });

  it.each([
    ['no productId in the address', ''],
    ['an empty productId', '?productId='],
    ['a productId that is not an id', '?productId=../../etc'],
  ])('answers 400 before asking Java anything for %s', async (_label, query) => {
    // No handler: an unhandled request would fail the test.
    const { request, formData } = tryOnRequest(query);

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(formData).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });

  it('answers 400 and generates nothing when the form names a different product than the claim', async () => {
    server.use(http.post(CLAIMS, allowed));

    const response = await POST(tryOnRequest(`?productId=${PRODUCT}`, OTHER_PRODUCT).request);

    expect(response.status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });

  it('still refuses another origin before anything else', async () => {
    const { request } = tryOnRequest(`?productId=${PRODUCT}`);
    const foreign = new Request(request.url, {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
      body: 'x',
    });

    const response = await POST(foreign);

    expect(response.status).toBe(403);
    expect(generate).not.toHaveBeenCalled();
  });
});
