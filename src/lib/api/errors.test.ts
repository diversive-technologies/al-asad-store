import { describe, expect, it } from 'vitest';

import { fromHttpStatus, retryAfterSecondsOf } from './errors';

/**
 * F-09 — a 429 is classified once, here, and carries the backend's `Retry-After`
 * when it sent a usable one. Nothing else in the storefront reads the header.
 */

function answer(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers });
}

describe('fromHttpStatus for a 429', () => {
  it('is RATE_LIMITED, carrying Retry-After in seconds', () => {
    expect(fromHttpStatus(answer(429, { 'Retry-After': '900' }))).toEqual({
      kind: 'RATE_LIMITED',
      message: 'Too many attempts were made.',
      retryAfterSeconds: 900,
    });
  });

  it('is RATE_LIMITED with no figure when the header is absent', () => {
    const error = fromHttpStatus(answer(429));

    expect(error).toEqual({ kind: 'RATE_LIMITED', message: 'Too many attempts were made.' });
    expect('retryAfterSeconds' in error).toBe(false);
  });

  it('is still RATE_LIMITED, with no figure, when the header is not seconds', () => {
    const error = fromHttpStatus(answer(429, { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' }));

    expect(error.kind).toBe('RATE_LIMITED');
    expect('retryAfterSeconds' in error).toBe(false);
  });
});

describe('retryAfterSecondsOf', () => {
  it.each([
    ['120', 120],
    [' 7 ', 7],
    ['1', 1],
    ['99999999', 86_400],
  ])('reads %j as %i seconds', (header, expected) => {
    expect(retryAfterSecondsOf(header)).toBe(expected);
  });

  it.each([null, '', '0', '-5', '1.5', 'soon', '12abc', '1234567890123'])(
    'reads %j as no usable figure',
    (header) => {
      expect(retryAfterSecondsOf(header)).toBeNull();
    },
  );
});
