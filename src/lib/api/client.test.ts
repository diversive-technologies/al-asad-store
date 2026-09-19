import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { apiRequest } from './client';

/**
 * SSOT-05 / DATA-01 — `apiRequest` is the one module that talks to the Java
 * backend, so what it sends and what it hands back are tested here once.
 *
 * DATA-03 — it returns a Result and never throws, for every answer a request
 * can meet. TEST-04: the network is mocked at the HTTP layer, so the real client
 * and its schema validation run. TEST-05: both branches of the Result.
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

const PATH = '/api/v1/test/resource';
const ENDPOINT = `*${PATH}`;

/** A `-> void` operation's schema: nothing, or an empty object. */
const voidSchema = z.union([z.null(), z.object({})]);
const itemSchema = z.object({ id: z.string() });

function call<TSchema extends z.ZodType>(schema: TSchema, method: 'GET' | 'HEAD' = 'GET') {
  return apiRequest({ path: PATH, schema, method, next: { revalidate: 0 } });
}

/** What reached the backend, recorded by the handler that answered it. */
interface Received {
  readonly method: string;
  readonly url: URL;
  readonly headers: Headers;
  readonly body: string;
}

function recordInto(sink: Received[]) {
  return async ({ request }: { request: Request }) => {
    sink.push({
      method: request.method,
      url: new URL(request.url),
      headers: request.headers,
      body: await request.clone().text(),
    });
    return HttpResponse.json({ id: 'a' });
  };
}

/** The one request a call sent — a second would be a retry nobody asked for. */
function onlyRequest(sink: readonly Received[]): Received {
  const [first, ...rest] = sink;
  if (first === undefined || rest.length > 0) {
    throw new Error(`expected exactly one request, got ${sink.length}`);
  }
  return first;
}

describe('apiRequest — the body of a successful response', () => {
  it('parses a JSON body against its schema', async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.json({ id: 'a' })));

    await expect(call(itemSchema)).resolves.toEqual({ ok: true, value: { id: 'a' } });
  });

  it('hands back what the schema produced, not the raw wire value', async () => {
    const trimmed = z.object({ id: z.string().trim() });
    server.use(http.get(ENDPOINT, () => HttpResponse.json({ id: '  a  ', extra: true })));

    await expect(call(trimmed)).resolves.toEqual({ ok: true, value: { id: 'a' } });
  });

  it.each([
    ['a 204', () => new HttpResponse(null, { status: 204 })],
    ['a 200 with no body at all', () => new HttpResponse(null, { status: 200 })],
    ['a 200 with a blank body', () => new HttpResponse('  ', { status: 200 })],
  ])('reads %s as null, which a void schema accepts', async (_label, respond) => {
    server.use(http.get(ENDPOINT, respond));

    await expect(call(voidSchema)).resolves.toEqual({ ok: true, value: null });
  });

  it('answers a HEAD with no body as null rather than throwing', async () => {
    server.use(http.head(ENDPOINT, () => new HttpResponse(null, { status: 200 })));

    await expect(call(z.null(), 'HEAD')).resolves.toEqual({ ok: true, value: null });
  });

  it('reports an empty body as a contract violation when the schema needs one', async () => {
    server.use(http.get(ENDPOINT, () => new HttpResponse(null, { status: 200 })));

    await expect(call(itemSchema)).resolves.toMatchObject({
      ok: false,
      error: { kind: 'CONTRACT_VIOLATION', path: PATH },
    });
  });

  it('reports a body that is not JSON as a contract violation, never a rejection', async () => {
    server.use(http.get(ENDPOINT, () => new HttpResponse('<html>oops</html>', { status: 200 })));

    await expect(call(voidSchema)).resolves.toMatchObject({
      ok: false,
      error: { kind: 'CONTRACT_VIOLATION', path: PATH },
    });
  });

  it('reports a JSON body of the wrong shape with the issues and the path it came from', async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.json({ id: 42 })));

    await expect(call(itemSchema)).resolves.toMatchObject({
      ok: false,
      error: {
        kind: 'CONTRACT_VIOLATION',
        path: PATH,
        issues: [expect.objectContaining({ path: ['id'] })],
      },
    });
  });
});

describe('apiRequest — a response that is not a success', () => {
  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [422, 'VALIDATION'],
    [429, 'RATE_LIMITED'],
    [500, 'SERVER'],
    [503, 'SERVER'],
  ])('maps %i onto %s, whatever the body says', async (status, kind) => {
    server.use(http.get(ENDPOINT, () => new HttpResponse('not json', { status })));

    await expect(call(voidSchema)).resolves.toMatchObject({ ok: false, error: { kind } });
  });

  it('keeps the status of a server failure, for the log', async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.json({ id: 'a' }, { status: 502 })));

    await expect(call(itemSchema)).resolves.toMatchObject({
      ok: false,
      error: { kind: 'SERVER', status: 502 },
    });
  });

  it('does not validate the body of a refusal against the success schema', async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.json({ id: 'a' }, { status: 404 })));

    await expect(call(itemSchema)).resolves.toMatchObject({
      ok: false,
      error: { kind: 'NOT_FOUND' },
    });
  });
});

describe('apiRequest — a request that never gets an answer', () => {
  it('reports a transport failure as NETWORK rather than rejecting', async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.error()));

    await expect(call(itemSchema)).resolves.toMatchObject({
      ok: false,
      error: { kind: 'NETWORK' },
    });
  });

  it('reports a backend slower than its budget as TIMEOUT', async () => {
    server.use(
      http.get(ENDPOINT, async () => {
        await delay(2_000);
        return HttpResponse.json({ id: 'a' });
      }),
    );

    await expect(
      apiRequest({ path: PATH, schema: itemSchema, timeoutMs: 20, next: { revalidate: 0 } }),
    ).resolves.toMatchObject({ ok: false, error: { kind: 'TIMEOUT' } });
  });

  it("reports a caller's own abort as TIMEOUT rather than rejecting", async () => {
    server.use(
      http.get(ENDPOINT, async () => {
        await delay(2_000);
        return HttpResponse.json({ id: 'a' });
      }),
    );
    const controller = new AbortController();
    const pending = apiRequest({
      path: PATH,
      schema: itemSchema,
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    controller.abort();

    await expect(pending).resolves.toMatchObject({ ok: false, error: { kind: 'TIMEOUT' } });
  });
});

describe('apiRequest — what reaches the backend', () => {
  it('sends a JSON body with its method, content type and the caller’s headers', async () => {
    const received: Received[] = [];
    server.use(http.post(ENDPOINT, recordInto(received)));

    await apiRequest({
      path: PATH,
      schema: itemSchema,
      method: 'POST',
      body: { quantity: 2 },
      headers: { 'x-cart-id': 'cart-1' },
      next: { revalidate: 0 },
    });

    const sent = onlyRequest(received);
    expect(sent).toMatchObject({ method: 'POST', body: '{"quantity":2}' });
    expect(sent.headers.get('content-type')).toBe('application/json');
    expect(sent.headers.get('accept')).toBe('application/json');
    expect(sent.headers.get('x-cart-id')).toBe('cart-1');
  });

  it('puts search parameters on the address and leaves out the ones that are unset', async () => {
    const received: Received[] = [];
    server.use(http.get(ENDPOINT, recordInto(received)));

    await apiRequest({
      path: PATH,
      schema: itemSchema,
      searchParams: { locale: 'ur', page: 2, inStock: true, colour: undefined },
      next: { revalidate: 0 },
    });

    const { url } = onlyRequest(received);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      locale: 'ur',
      page: '2',
      inStock: 'true',
    });
    expect(url.pathname).toBe(PATH);
  });

  it('sends no body at all when there is none', async () => {
    const received: Received[] = [];
    server.use(http.get(ENDPOINT, recordInto(received)));

    await call(itemSchema);

    expect(onlyRequest(received).body).toBe('');
  });

  it('sends a file as multipart, with the boundary the platform writes rather than a JSON type', async () => {
    const received: Received[] = [];
    server.use(http.post(ENDPOINT, recordInto(received)));
    const form = new FormData();
    form.set('garment', 'kameez');

    await apiRequest({
      path: PATH,
      schema: itemSchema,
      method: 'POST',
      body: form,
      next: { revalidate: 0 },
    });

    const sent = onlyRequest(received);
    expect(sent.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/);
    expect(sent.body).toContain('kameez');
  });
});
