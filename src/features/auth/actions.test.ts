import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { en } from '@/i18n/messages/en';
import { ENDPOINTS } from '@/lib/api/endpoints';

import {
  authRefusal,
  resetConfirmOutcomeOf,
  resetOutcomeOf,
  signUpRefusal,
} from './lib/auth-failure';
import { SESSION_COOKIE } from './lib/session-cookie';
import { openSession } from './lib/session-token';
import {
  confirmPasswordResetAction,
  requestCodeAction,
  requestPasswordResetAction,
  signInWithCodeAction,
  signInWithPasswordAction,
  signUpAction,
} from './actions';

/**
 * The §11 actions at the HTTP boundary (TEST-04): the real client and its schema
 * validation run, and only the backend's answer is chosen.
 */

const written = vi.hoisted(() => new Map<string, string>());

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      set: (name: string, value: string) => {
        written.set(name, value);
      },
      get: () => undefined,
    }),
  headers: () => Promise.resolve(new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' })),
}));

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  written.clear();
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

/** F-01 — what a successful sign-in leaves in the browser is a SIGNED token, not JSON. */
describe('the session cookie a sign-in writes', () => {
  it('is a sealed, verifiable token and not the session as plain JSON', async () => {
    const session = { displayName: 'Ayesha', email: 'ayesha@example.com', mobile: '03001234567' };
    server.use(http.post(`*${ENDPOINTS.auth.authenticate}`, () => HttpResponse.json(session)));

    await signInWithPasswordAction({ email: session.email, password: 'a long passphrase' });

    const value = written.get(SESSION_COOKIE);
    expect(value).toMatch(/^v1\.[\w-]+\.[\w-]+$/);
    expect(value).not.toContain('ayesha@example.com');
    expect(openSession(value ?? '', new Date())).toEqual(session);
  });
});

/**
 * F-02 — Java rate-limits sign-in, codes, sign-up and reset by the customer's
 * address (A-03), and from Java every call comes from this server. Each action
 * passes on the address of the request it is answering.
 */
describe('the customer’s address on the calls behind a limit', () => {
  const ADDRESS = '203.0.113.9';

  function seenBy(path: string, answer: () => Response) {
    const seen: (string | null)[] = [];
    server.use(
      http.post(`*${path}`, ({ request }) => {
        seen.push(request.headers.get('x-client-ip'));
        return answer();
      }),
    );
    return seen;
  }

  const session = { displayName: 'Ayesha', email: 'ayesha@example.com', mobile: '03001234567' };

  it('goes with a password sign-in', async () => {
    const seen = seenBy(ENDPOINTS.auth.authenticate, () => HttpResponse.json(session));

    await signInWithPasswordAction({ email: session.email, password: 'a long passphrase' });

    expect(seen).toEqual([ADDRESS]);
  });

  it('goes with a code request', async () => {
    const seen = seenBy(ENDPOINTS.auth.issueCode, () => new HttpResponse(null, { status: 204 }));

    await requestCodeAction({ mobile: '03001234567' });

    expect(seen).toEqual([ADDRESS]);
  });

  it('goes with a code sign-in', async () => {
    const seen = seenBy(ENDPOINTS.auth.authenticateByCode, () => HttpResponse.json(session));

    await signInWithCodeAction({ mobile: '03001234567', code: '123456' });

    expect(seen).toEqual([ADDRESS]);
  });

  it('goes with a sign-up', async () => {
    const seen = seenBy(ENDPOINTS.auth.register, () => HttpResponse.json(session));

    await signUpAction({
      fullName: 'Ayesha Khan',
      email: session.email,
      mobile: '03001234567',
      password: 'a long passphrase',
      confirmPassword: 'a long passphrase',
    });

    expect(seen).toEqual([ADDRESS]);
  });

  it('goes with a password reset request', async () => {
    const seen = seenBy(
      ENDPOINTS.auth.resetPassword,
      () => new HttpResponse(null, { status: 204 }),
    );

    await requestPasswordResetAction({ email: session.email });

    expect(seen).toEqual([ADDRESS]);
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

/**
 * F-03 — redeeming a reset link, at the HTTP boundary. Four outcomes reach the
 * page, and what the backend is SENT is as exact as what it answers: the token and
 * the password only — the confirmation stays on this side.
 */
describe('confirmPasswordResetAction', () => {
  const TOKEN = 'c0ffee'.repeat(10) + 'beef';
  const input = {
    token: TOKEN,
    password: 'a long passphrase',
    confirmPassword: 'a long passphrase',
  };
  const CONFIRM = `*${ENDPOINTS.auth.confirmPasswordReset}`;

  it('sends the token and the new password, and nothing else, and answers ok', async () => {
    const received: { body: unknown; address: string | null }[] = [];
    server.use(
      http.post(CONFIRM, async ({ request }) => {
        received.push({ body: await request.json(), address: request.headers.get('x-client-ip') });
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(confirmPasswordResetAction(input)).resolves.toEqual({ ok: true, value: null });
    expect(received).toEqual([
      { body: { token: TOKEN, password: 'a long passphrase' }, address: '203.0.113.9' },
    ]);
  });

  it('does not sign the customer in', async () => {
    server.use(http.post(CONFIRM, () => new HttpResponse(null, { status: 204 })));

    await confirmPasswordResetAction(input);

    expect(written.size).toBe(0);
  });

  it('reports an unknown, used or expired token as the backend’s 400', async () => {
    server.use(
      http.post(CONFIRM, () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Bad Request',
            status: 400,
            detail: 'RESET_INVALID_OR_EXPIRED',
          },
          { status: 400 },
        ),
      ),
    );

    const result = await confirmPasswordResetAction(input);

    expect(resetConfirmOutcomeOf(result)).toBe('EXPIRED');
  });

  it('reports a rate limit', async () => {
    server.use(http.post(CONFIRM, () => new HttpResponse(null, { status: 429 })));

    expect(resetConfirmOutcomeOf(await confirmPasswordResetAction(input))).toBe('RATE_LIMITED');
  });

  it('reports a store that could not be reached', async () => {
    server.use(http.post(CONFIRM, () => HttpResponse.error()));

    expect(resetConfirmOutcomeOf(await confirmPasswordResetAction(input))).toBe('UNREACHABLE');
  });

  it.each([
    ['a token that is not 64 hex characters', { ...input, token: 'nope' }],
    ['two passwords that differ', { ...input, confirmPassword: 'something else entirely' }],
    ['a password that is too short', { ...input, password: 'short', confirmPassword: 'short' }],
    ['nothing at all', undefined],
  ])('refuses %s before anything is sent', async (_label, bad) => {
    const result = await confirmPasswordResetAction(bad);

    expect(result).toMatchObject({ ok: false, error: { kind: 'VALIDATION' } });
  });
});

/**
 * F-09 — a 429 from Java reaches the customer in words on every auth surface:
 * "wait", never "wrong password", "invalid number", "could not create" or "a link
 * is on its way". One case per surface, each with the backend answering 429.
 */
describe('Java’s rate limit on the auth surfaces', () => {
  const WAIT = 'Too many attempts. Please wait a few minutes and try again.';
  const tooMany = () => new HttpResponse(null, { status: 429, headers: { 'Retry-After': '900' } });

  it('is classified once, carrying Retry-After', async () => {
    server.use(http.post(`*${ENDPOINTS.auth.authenticate}`, tooMany));

    const result = await signInWithPasswordAction({
      email: 'ayesha@example.com',
      password: 'a long passphrase',
    });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'RATE_LIMITED',
        message: 'Too many attempts were made.',
        retryAfterSeconds: 900,
      },
    });
  });

  it('says wait for a password sign-in', async () => {
    server.use(http.post(`*${ENDPOINTS.auth.authenticate}`, tooMany));
    const result = await signInWithPasswordAction({
      email: 'ayesha@example.com',
      password: 'a long passphrase',
    });

    expect(!result.ok && authRefusal(result.error, en.auth.signInRefused, en)).toBe(WAIT);
  });

  it('says wait for a code sign-in', async () => {
    server.use(http.post(`*${ENDPOINTS.auth.authenticateByCode}`, tooMany));
    const result = await signInWithCodeAction({ mobile: '03001234567', code: '123456' });

    expect(!result.ok && authRefusal(result.error, en.auth.codeRefused, en)).toBe(WAIT);
  });

  it('says wait for a code request', async () => {
    server.use(http.post(`*${ENDPOINTS.auth.issueCode}`, tooMany));
    const result = await requestCodeAction({ mobile: '03001234567' });

    expect(!result.ok && authRefusal(result.error, en.auth.mobileInvalid, en)).toBe(WAIT);
  });

  it('says wait for a sign-up, and not that the account could not be created', async () => {
    server.use(http.post(`*${ENDPOINTS.auth.register}`, tooMany));
    const result = await signUpAction({
      fullName: 'Ayesha Khan',
      email: 'ayesha@example.com',
      mobile: '03001234567',
      password: 'a long passphrase',
      confirmPassword: 'a long passphrase',
    });

    expect(!result.ok && signUpRefusal(result.error, en)).toBe(WAIT);
  });

  it('keeps a collision a collision on sign-up', () => {
    expect(signUpRefusal({ kind: 'CONFLICT', message: 'taken' }, en)).toBe(en.auth.emailTaken);
    expect(signUpRefusal({ kind: 'SERVER', message: 'bad', status: 400 }, en)).toBe(
      en.auth.signUpFailed,
    );
  });

  it('says wait for a reset request, instead of "a link is on its way"', async () => {
    server.use(http.post(`*${ENDPOINTS.auth.resetPassword}`, tooMany));
    const result = await requestPasswordResetAction({ email: 'ayesha@example.com' });

    expect(resetOutcomeOf(result)).toBe('RATE_LIMITED');
  });

  it('still says nothing about the account when Java answers 204 for an email-limited reset', async () => {
    server.use(
      http.post(`*${ENDPOINTS.auth.resetPassword}`, () => new HttpResponse(null, { status: 204 })),
    );
    const result = await requestPasswordResetAction({ email: 'ayesha@example.com' });

    expect(resetOutcomeOf(result)).toBe('SENT');
  });

  it('says wait for a reset confirmation', async () => {
    server.use(http.post(`*${ENDPOINTS.auth.confirmPasswordReset}`, tooMany));
    const result = await confirmPasswordResetAction({
      token: 'ab'.repeat(32),
      password: 'a long passphrase',
      confirmPassword: 'a long passphrase',
    });

    expect(resetConfirmOutcomeOf(result)).toBe('RATE_LIMITED');
  });
});
