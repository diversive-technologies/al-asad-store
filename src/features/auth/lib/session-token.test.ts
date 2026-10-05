import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Session } from '../schemas/auth.schema';

/**
 * F-01 — the environment-bound half: which secrets sign and which only open, and
 * what `readSession` does with each kind of cookie value.
 */

const env: { SESSION_SECRET: string; SESSION_SECRET_PREVIOUS: string | undefined } = vi.hoisted(
  () => ({
    SESSION_SECRET: 'current-secret-that-is-at-least-32-characters',
    SESSION_SECRET_PREVIOUS: undefined,
  }),
);

vi.mock('@/config/env.server', () => ({ serverEnv: env }));

const cookieJar = vi.hoisted(() => new Map<string, string>());
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => {
        const value = cookieJar.get(name);
        return value === undefined ? undefined : { name, value };
      },
      set: (name: string, value: string) => {
        cookieJar.set(name, value);
      },
      delete: (name: string) => {
        cookieJar.delete(name);
      },
    }),
}));

import { readSession } from '../actions';

import { SESSION_COOKIE } from './session-cookie';
import { sealSessionWith } from './session-seal';
import { openSession, sealSession } from './session-token';

const session: Session = {
  displayName: 'Ayesha Khan',
  email: 'ayesha@example.com',
  mobile: '03001234567',
};

beforeEach(() => {
  env.SESSION_SECRET = 'current-secret-that-is-at-least-32-characters';
  env.SESSION_SECRET_PREVIOUS = undefined;
  cookieJar.clear();
});

describe('sealSession / openSession', () => {
  it('round-trips with the current secret', () => {
    const now = new Date();

    expect(openSession(sealSession(session, now), now)).toEqual(session);
  });

  it('opens a token signed with the previous secret, and signs only with the current one', () => {
    const now = new Date();
    const previous = 'previous-secret-that-is-at-least-32-characters';
    const old = sealSessionWith(session, Math.floor(now.getTime() / 1000), previous);

    expect(openSession(old, now)).toBeNull();

    env.SESSION_SECRET_PREVIOUS = previous;
    expect(openSession(old, now)).toEqual(session);

    // Nothing new is signed with the previous secret.
    env.SESSION_SECRET_PREVIOUS = undefined;
    env.SESSION_SECRET = 'rotated-secret-that-is-at-least-32-characters';
    const fresh = sealSession(session, now);
    expect(openSession(fresh, now)).toEqual(session);
    env.SESSION_SECRET = previous;
    expect(openSession(fresh, now)).toBeNull();
  });
});

describe('readSession', () => {
  it('reads a genuine signed cookie', async () => {
    cookieJar.set(SESSION_COOKIE, sealSession(session, new Date()));

    await expect(readSession()).resolves.toEqual(session);
  });

  it('treats the old unsigned JSON cookie as signed out', async () => {
    cookieJar.set(SESSION_COOKIE, JSON.stringify(session));

    await expect(readSession()).resolves.toBeNull();
  });

  it('treats an expired cookie as signed out', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    cookieJar.set(SESSION_COOKIE, sealSession(session, eightDaysAgo));

    await expect(readSession()).resolves.toBeNull();
  });

  it('treats no cookie, and an empty one, as signed out', async () => {
    await expect(readSession()).resolves.toBeNull();
    cookieJar.set(SESSION_COOKIE, '');
    await expect(readSession()).resolves.toBeNull();
  });
});
