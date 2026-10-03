import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';

import { subscribeToNewsletterAction } from './actions';

/**
 * F-02 — the newsletter is rate-limited per address in Java (A-03), and from Java
 * every call comes from this server, so the action passes on the address of the
 * request it is answering.
 */

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' })),
}));

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

describe('subscribeToNewsletterAction', () => {
  it('passes on the customer’s address', async () => {
    let seen: string | null = null;
    server.use(
      http.post(`*${ENDPOINTS.newsletter.subscribe}`, ({ request }) => {
        seen = request.headers.get('x-client-ip');
        return HttpResponse.json({ status: 'SUBSCRIBED' });
      }),
    );

    await subscribeToNewsletterAction({ email: 'someone@example.com' });

    expect(seen).toBe('203.0.113.9');
  });
});
