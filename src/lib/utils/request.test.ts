import { describe, expect, it } from 'vitest';

import { isSameOrigin } from './request';

function requestWith(origin: string | null): Request {
  return new Request(
    'https://shop.example.com/api/try-on',
    origin === null ? {} : { headers: { origin } },
  );
}

describe('isSameOrigin', () => {
  it('accepts a request from its own origin', () => {
    expect(isSameOrigin(requestWith('https://shop.example.com'))).toBe(true);
  });

  it('refuses a request from another origin', () => {
    expect(isSameOrigin(requestWith('https://attacker.example'))).toBe(false);
  });

  /* A different scheme or port is a different origin, and both are the shapes a
     real attempt takes. */
  it('refuses a different scheme or port on the same host', () => {
    expect(isSameOrigin(requestWith('http://shop.example.com'))).toBe(false);
    expect(isSameOrigin(requestWith('https://shop.example.com:8443'))).toBe(false);
  });

  /* Absence is not evidence: browsers omit `Origin` on same-origin navigations
     and on server-to-server calls, and a forged request always carries one. */
  it('allows a request that sends no origin at all', () => {
    expect(isSameOrigin(requestWith(null))).toBe(true);
  });
});
