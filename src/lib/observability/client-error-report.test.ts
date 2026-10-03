import { describe, expect, it } from 'vitest';

import {
  CLIENT_ERROR_MAX_BYTES,
  parseClientError,
  pathnameOf,
  WindowLimiter,
} from './client-error-report';

/** F-08 — what the public error endpoint believes of a browser's report. */
describe('parseClientError', () => {
  it('takes a message, a digest and a pathname', () => {
    expect(
      parseClientError(JSON.stringify({ message: 'boom', digest: 'abc123', path: '/catalogue' })),
    ).toEqual({ message: 'boom', digest: 'abc123', path: '/catalogue' });
  });

  it('treats a missing or null digest as none', () => {
    expect(parseClientError(JSON.stringify({ message: 'boom', path: '/bag' }))?.digest).toBeNull();
    expect(
      parseClientError(JSON.stringify({ message: 'boom', digest: null, path: '/bag' }))?.digest,
    ).toBeNull();
  });

  it('keeps only the pathname of the page, never its query or fragment', () => {
    const report = parseClientError(
      JSON.stringify({ message: 'x', path: '/reset-password?token=secret#frag' }),
    );

    expect(report?.path).toBe('/reset-password');
  });

  it('drops every other field a browser might add', () => {
    const report = parseClientError(
      JSON.stringify({ message: 'x', path: '/', stack: 'at secret', cookie: 'session=1' }),
    );

    expect(report).toEqual({ message: 'x', digest: null, path: '/' });
  });

  it.each([
    ['an empty body', ''],
    ['text that is not JSON', 'not json'],
    ['JSON that is not an object', '"just a string"'],
    ['a missing message', JSON.stringify({ path: '/' })],
    ['a message over 500 characters', JSON.stringify({ message: 'x'.repeat(501), path: '/' })],
    [
      'a digest over 64 characters',
      JSON.stringify({ message: 'x', digest: 'd'.repeat(65), path: '/' }),
    ],
    ['a path over 200 characters', JSON.stringify({ message: 'x', path: `/${'p'.repeat(200)}` })],
    ['a message that is not a string', JSON.stringify({ message: 42, path: '/' })],
  ])('refuses %s', (_label, body) => {
    expect(parseClientError(body)).toBeNull();
  });

  it('refuses a body over 2 kB, even if it would otherwise parse', () => {
    const body = JSON.stringify({
      message: 'x',
      path: '/',
      pad: 'p'.repeat(CLIENT_ERROR_MAX_BYTES),
    });

    expect(body.length).toBeGreaterThan(CLIENT_ERROR_MAX_BYTES);
    expect(parseClientError(body)).toBeNull();
  });

  it('counts bytes, not characters: 2 kB of Urdu is over the limit', () => {
    const body = JSON.stringify({ message: 'پ'.repeat(500), path: '/', pad: 'پ'.repeat(600) });

    expect(parseClientError(body)).toBeNull();
  });
});

describe('pathnameOf', () => {
  it.each([
    ['/order/AA100001?mobile=03001234567', '/order/AA100001'],
    ['/catalogue#top', '/catalogue'],
    ['/', '/'],
    ['https://evil.example/x', '(unknown)'],
    ['//evil.example/x', '(unknown)'],
    ['relative/path', '(unknown)'],
    ['', '(unknown)'],
  ])('reduces %j to %j', (path, expected) => {
    expect(pathnameOf(path)).toBe(expected);
  });
});

describe('WindowLimiter', () => {
  it('allows five a minute per key and refuses the sixth', () => {
    const limiter = new WindowLimiter(5, 60_000);

    const answers = Array.from({ length: 6 }, () => limiter.allow('203.0.113.9', 1_000));

    expect(answers).toEqual([true, true, true, true, true, false]);
  });

  it('counts each key on its own', () => {
    const limiter = new WindowLimiter(1, 60_000);

    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('a', 1)).toBe(false);
    expect(limiter.allow('b', 1)).toBe(true);
  });

  it('opens a fresh window once the minute is over', () => {
    const limiter = new WindowLimiter(1, 60_000);

    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('a', 59_999)).toBe(false);
    expect(limiter.allow('a', 60_000)).toBe(true);
  });

  it('does not grow without bound: full of live keys, it refuses a new one', () => {
    const limiter = new WindowLimiter(5, 60_000, 3);

    expect(['a', 'b', 'c'].map((key) => limiter.allow(key, 0))).toEqual([true, true, true]);
    expect(limiter.allow('d', 1)).toBe(false);
    // Once the old windows have lapsed they are pruned and a new key fits.
    expect(limiter.allow('d', 60_001)).toBe(true);
  });
});
