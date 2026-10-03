import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { Session } from '../schemas/auth.schema';

import { openSessionWith, sealSessionWith, SESSION_LIFETIME_SECONDS } from './session-seal';

/**
 * F-01 — the signed session cookie. Every refusal returns `null` rather than
 * throwing, because the reader treats `null` as "signed out" and a throw would
 * take down every page for anybody holding a bad cookie.
 */

const SECRET = 'a-secret-that-is-at-least-32-characters-long';
const OTHER = 'a-different-secret-that-is-also-32-chars!!';
const NOW = 1_800_000_000;

const session: Session = {
  displayName: 'Ayesha Khan',
  email: 'ayesha@example.com',
  mobile: '03001234567',
};

function reSign(payload: object, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(`v1.${encoded}`).digest('base64url');
  return `v1.${encoded}.${signature}`;
}

describe('sealSessionWith / openSessionWith', () => {
  it('round-trips a session', () => {
    const token = sealSessionWith(session, NOW, SECRET);

    expect(token.startsWith('v1.')).toBe(true);
    expect(openSessionWith(token, NOW + 60, [SECRET])).toEqual(session);
  });

  it('opens until seven days after it was issued, and not at the expiry', () => {
    const token = sealSessionWith(session, NOW, SECRET);

    expect(openSessionWith(token, NOW + SESSION_LIFETIME_SECONDS - 1, [SECRET])).toEqual(session);
    expect(openSessionWith(token, NOW + SESSION_LIFETIME_SECONDS, [SECRET])).toBeNull();
  });

  it('refuses a tampered payload — the same signature over a different customer', () => {
    const [version, , signature] = sealSessionWith(session, NOW, SECRET).split('.');
    const forged = Buffer.from(
      JSON.stringify({
        s: { ...session, email: 'victim@example.com' },
        iat: NOW,
        exp: NOW + SESSION_LIFETIME_SECONDS,
      }),
    ).toString('base64url');

    expect(openSessionWith(`${version}.${forged}.${signature}`, NOW, [SECRET])).toBeNull();
  });

  it('refuses a tampered signature', () => {
    const token = sealSessionWith(session, NOW, SECRET);
    const flipped = `${token.slice(0, -2)}${token.endsWith('AA') ? 'BB' : 'AA'}`;

    expect(openSessionWith(flipped, NOW, [SECRET])).toBeNull();
    expect(openSessionWith(`${token}x`, NOW, [SECRET])).toBeNull();
  });

  it('refuses a token signed with a different secret', () => {
    expect(openSessionWith(sealSessionWith(session, NOW, OTHER), NOW, [SECRET])).toBeNull();
  });

  it('refuses an expired token even though the signature is genuine', () => {
    const expired = reSign({ s: session, iat: NOW - 1000, exp: NOW - 1 }, SECRET);

    expect(openSessionWith(expired, NOW, [SECRET])).toBeNull();
  });

  it('refuses a genuine signature over a payload with no expiry', () => {
    expect(openSessionWith(reSign({ s: session, iat: NOW }, SECRET), NOW, [SECRET])).toBeNull();
  });

  it('refuses a genuine signature over something that is not a session', () => {
    const token = reSign({ s: { displayName: '' }, iat: NOW, exp: NOW + 100 }, SECRET);

    expect(openSessionWith(token, NOW, [SECRET])).toBeNull();
  });

  it('refuses an unsigned legacy cookie: the session as plain JSON', () => {
    expect(openSessionWith(JSON.stringify(session), NOW, [SECRET])).toBeNull();
    expect(openSessionWith(encodeURIComponent(JSON.stringify(session)), NOW, [SECRET])).toBeNull();
  });

  it('refuses a token claiming another version', () => {
    const [, payload, signature] = sealSessionWith(session, NOW, SECRET).split('.');

    expect(openSessionWith(`v2.${payload}.${signature}`, NOW, [SECRET])).toBeNull();
  });

  it.each([
    ['empty', ''],
    ['one segment', 'v1'],
    ['two segments', 'v1.abc'],
    ['four segments', 'v1.a.b.c'],
    ['empty segments', 'v1..'],
  ])('refuses a malformed token: %s', (_label, token) => {
    expect(openSessionWith(token, NOW, [SECRET])).toBeNull();
  });

  it('refuses an oversized value (8 kB) before decoding it', () => {
    const huge = `v1.${'a'.repeat(8 * 1024)}.${'b'.repeat(43)}`;

    expect(openSessionWith(huge, NOW, [SECRET])).toBeNull();
  });

  it('opens a token signed with the previous secret during a rotation, and only then', () => {
    const old = sealSessionWith(session, NOW, OTHER);

    expect(openSessionWith(old, NOW, [SECRET, OTHER])).toEqual(session);
    expect(openSessionWith(old, NOW, [SECRET])).toBeNull();
  });
});
