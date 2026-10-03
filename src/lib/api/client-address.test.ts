import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clientAddressHeader, currentClientAddressHeader } from './client-address';

/**
 * F-02 — the customer's address as Java will be told it. The function is what
 * stands between a header any caller can write and a value Java rate-limits on,
 * so every refusal is a case.
 */

const incoming = vi.hoisted(() => ({ forwardedFor: null as string | null }));

vi.mock('next/headers', () => ({
  headers: () =>
    Promise.resolve(
      new Headers(
        incoming.forwardedFor === null ? {} : { 'x-forwarded-for': incoming.forwardedFor },
      ),
    ),
}));

beforeEach(() => {
  incoming.forwardedFor = null;
});

function requestFrom(forwardedFor: string | null): Request {
  return new Request('https://store.example/api/x', {
    headers: forwardedFor === null ? {} : { 'x-forwarded-for': forwardedFor },
  });
}

describe('clientAddressHeader', () => {
  it.each([
    ['an IPv4 address', '203.0.113.9', '203.0.113.9'],
    ['an IPv6 address', '2001:db8::7334', '2001:db8::7334'],
    [
      'the first entry of a chain, which is the customer',
      '203.0.113.9, 10.0.0.1, 10.0.0.2',
      '203.0.113.9',
    ],
    ['an entry with stray spaces', '  203.0.113.9  ', '203.0.113.9'],
  ])('forwards %s', (_label, header, expected) => {
    expect(clientAddressHeader(requestFrom(header))).toEqual({ 'x-client-ip': expected });
  });

  it.each([
    ['no header', null],
    ['an empty header', ''],
    ['garbage', 'not-an-address'],
    ['an address with a port, which is not one', '203.0.113.9:8080'],
    ['a 300-character value', 'a'.repeat(300)],
    ['an address out of range', '999.1.1.1'],
  ])('forwards nothing for %s', (_label, header) => {
    expect(clientAddressHeader(requestFrom(header))).toEqual({});
  });

  it('does not fall through to a later entry when the first is not an address', () => {
    expect(clientAddressHeader(requestFrom('garbage, 203.0.113.9'))).toEqual({});
  });
});

describe('currentClientAddressHeader — for a Server Action, which has no Request', () => {
  it('reads the address from the incoming request headers', async () => {
    incoming.forwardedFor = '198.51.100.4, 10.1.1.1';

    await expect(currentClientAddressHeader()).resolves.toEqual({ 'x-client-ip': '198.51.100.4' });
  });

  it('forwards nothing when none arrived', async () => {
    await expect(currentClientAddressHeader()).resolves.toEqual({});
  });
});
