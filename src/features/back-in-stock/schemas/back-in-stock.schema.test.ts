import { describe, expect, it } from 'vitest';

import {
  MAX_EMAIL_LENGTH,
  backInStockEmailFormSchema,
  backInStockOutcomeSchema,
  backInStockRequestSchema,
} from './back-in-stock.schema';

/**
 * What a Notify Me request may carry before it is sent — the address bound
 * included, which is the SEC-02 part.
 */

const PRODUCT = '7d1f0a2c-9b4e-4c8a-8f21-000000000001';
const PIECE = '7d1f0a2c-9b4e-4c8a-8f21-000000000002';
const SIZE = '7d1f0a2c-9b4e-4c8a-8f21-000000000003';

/** An address of exactly `length` characters. */
function addressOf(length: number): string {
  const domain = '@example.com';
  return `${'a'.repeat(length - domain.length)}${domain}`;
}

function requestWith(email: string | null, pieceId: string | null = PIECE) {
  return { productId: PRODUCT, pieceId, sizeId: SIZE, email };
}

describe('a Notify Me request', () => {
  it.each([
    ['a guest’s address, for one piece', requestWith('guest@example.com')],
    ['a signed-in customer, who sends no address', requestWith(null)],
    ['the whole product in a size', requestWith('guest@example.com', null)],
    ['the longest address there is', requestWith(addressOf(MAX_EMAIL_LENGTH))],
  ])('is accepted for %s', (_case, request) => {
    expect(backInStockRequestSchema.safeParse(request).success).toBe(true);
  });

  it.each([
    ['an address one character too long', requestWith(addressOf(MAX_EMAIL_LENGTH + 1))],
    ['something that is not an address', requestWith('not an address')],
    ['an empty address', requestWith('')],
  ])('is refused for %s', (_case, request) => {
    expect(backInStockRequestSchema.safeParse(request).success).toBe(false);
  });

  it('trims a pasted address rather than refusing it for a stray space', () => {
    expect(backInStockEmailFormSchema.parse({ email: '  guest@example.com ' })).toEqual({
      email: 'guest@example.com',
    });
  });

  it('refuses an answer the storefront does not know how to tell', () => {
    expect(backInStockOutcomeSchema.safeParse({ kind: 'SENT' }).success).toBe(false);
  });
});
