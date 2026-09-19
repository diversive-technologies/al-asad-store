import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';

import { requestCodeAction, requestPasswordResetAction, signInWithPasswordAction } from './actions';

/**
 * The §11 actions at the HTTP boundary (TEST-04): the real client and its schema
 * validation run, and only the backend's answer is chosen.
 */

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ set: () => undefined, get: () => undefined }),
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

describe('requestPasswordResetAction', () => {
  it.each(['', 'abc'])('refuses %j before anything is sent (BUG-09)', async (email) => {
    const result = await requestPasswordResetAction({ email });

    expect(result).toMatchObject({ ok: false, error: { kind: 'VALIDATION' } });
  });

  it.each([204, 404])(
    'says nothing about the account when the backend answers %i',
    async (status) => {
      server.use(
        http.post(`*${ENDPOINTS.auth.resetPassword}`, () => new HttpResponse(null, { status })),
      );

      await expect(requestPasswordResetAction({ email: 'someone@example.com' })).resolves.toEqual({
        ok: true,
        value: null,
      });
    },
  );

  it('reports a store that could not be reached, rather than a link on its way', async () => {
    server.use(http.post(`*${ENDPOINTS.auth.resetPassword}`, () => HttpResponse.error()));

    const result = await requestPasswordResetAction({ email: 'someone@example.com' });

    expect(result).toMatchObject({ ok: false, error: { kind: 'NETWORK' } });
  });
});

/** BUG-10 — an outage reaches the form as an outage, so the form can say so. */
describe('an outage during sign-in', () => {
  it('is a NETWORK failure for a password sign-in, not a refusal', async () => {
    server.use(http.post(`*${ENDPOINTS.auth.authenticate}`, () => HttpResponse.error()));

    const result = await signInWithPasswordAction({
      email: 'customer@example.com',
      password: 'a long passphrase',
    });

    expect(result).toMatchObject({ ok: false, error: { kind: 'NETWORK' } });
  });

  it('is a NETWORK failure for a code request, not an invalid number', async () => {
    server.use(http.post(`*${ENDPOINTS.auth.issueCode}`, () => HttpResponse.error()));

    const result = await requestCodeAction({ mobile: '03001234567' });

    expect(result).toMatchObject({ ok: false, error: { kind: 'NETWORK' } });
  });
});
