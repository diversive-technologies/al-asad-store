import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

/**
 * F-02 — what identifies this server to Java on every call: the Access service
 * token when it is configured, and a fresh request id always. The token is what
 * lets Java trust the identity headers beside it, so its absence in development
 * and its presence in a hosted environment are both pinned.
 */

const env = vi.hoisted(() => ({
  JAVA_API_BASE_URL: 'http://localhost:8080',
  JAVA_API_TIMEOUT_MS: 10_000,
  CF_ACCESS_CLIENT_ID: undefined as string | undefined,
  CF_ACCESS_CLIENT_SECRET: undefined as string | undefined,
}));

vi.mock('@/config/env.server', () => ({ serverEnv: env }));

import { apiRequest } from './client';

const server = setupServer();
const received: Headers[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
beforeEach(() => {
  received.length = 0;
  env.CF_ACCESS_CLIENT_ID = undefined;
  env.CF_ACCESS_CLIENT_SECRET = undefined;
  server.use(
    http.get('*/api/v1/test/resource', ({ request }) => {
      received.push(request.headers);
      return HttpResponse.json({});
    }),
  );
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

function call(headers: Record<string, string> = {}) {
  return apiRequest({
    path: '/api/v1/test/resource',
    schema: z.object({}),
    headers,
    next: { revalidate: 0 },
  });
}

describe('the Access service token', () => {
  it('is sent as CF-Access-Client-Id and CF-Access-Client-Secret when both are configured', async () => {
    env.CF_ACCESS_CLIENT_ID = 'client-id.access';
    env.CF_ACCESS_CLIENT_SECRET = 'client-secret-value';

    await call();

    expect(received[0]?.get('CF-Access-Client-Id')).toBe('client-id.access');
    expect(received[0]?.get('CF-Access-Client-Secret')).toBe('client-secret-value');
  });

  it('is absent when it is not configured, as in local development', async () => {
    await call();

    expect(received[0]?.has('CF-Access-Client-Id')).toBe(false);
    expect(received[0]?.has('CF-Access-Client-Secret')).toBe(false);
  });

  it('is never half-sent: an id with no secret sends neither', async () => {
    env.CF_ACCESS_CLIENT_ID = 'client-id.access';

    await call();

    expect(received[0]?.has('CF-Access-Client-Id')).toBe(false);
  });

  it('cannot be overwritten by a caller’s own headers', async () => {
    env.CF_ACCESS_CLIENT_ID = 'client-id.access';
    env.CF_ACCESS_CLIENT_SECRET = 'client-secret-value';

    await call({ 'CF-Access-Client-Id': 'someone-else' });

    expect(received[0]?.get('CF-Access-Client-Id')).toBe('client-id.access');
  });
});

describe('x-request-id', () => {
  it('is a fresh UUID on every call', async () => {
    await call();
    await call();

    const [first, second] = received.map((headers) => headers.get('x-request-id'));
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(second).not.toBe(first);
  });
});
