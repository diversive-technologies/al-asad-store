import { describe, expect, it } from 'vitest';

import { backInStockBody, backInStockShape } from '@/lib/mocks/request-bodies';

import {
  MAX_EMAIL_LENGTH,
  backInStockEmailFormSchema,
  backInStockOutcomeSchema,
  backInStockRequestSchema,
} from './back-in-stock.schema';

/**
 * The mock that stands in for Java states the request's wire shape for itself
 * (MOD-01: `lib/` never imports a feature), so this holds the two together — the
 * address bound included, which is the SEC-02 part.
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

describe('a Notify Me request and the body the mock backend reads', () => {
  it.each([
    ['a guest’s address, for one piece', requestWith('guest@example.com')],
    ['a signed-in customer, who sends no address', requestWith(null)],
    ['the whole product in a size', requestWith('guest@example.com', null)],
    ['the longest address there is', requestWith(addressOf(MAX_EMAIL_LENGTH))],
  ])('passes both for %s', (_case, request) => {
    const sent = backInStockRequestSchema.safeParse(request);

    expect(sent.success).toBe(true);
    expect(backInStockBody.safeParse(sent.data).success).toBe(true);
  });

  it.each([
    ['an address one character too long', requestWith(addressOf(MAX_EMAIL_LENGTH + 1))],
    ['something that is not an address', requestWith('not an address')],
    ['an empty address', requestWith('')],
  ])('is refused by both for %s', (_case, request) => {
    expect(backInStockRequestSchema.safeParse(request).success).toBe(false);
    expect(backInStockBody.safeParse(request).success).toBe(false);
  });

  /* A refused ADDRESS is the backend's 422, not its 400: the body is well formed. */
  it('keeps a refused address in the body’s shape, so it is refused as the address', () => {
    expect(backInStockShape.safeParse(requestWith('not an address')).success).toBe(true);
    expect(backInStockShape.safeParse({ ...requestWith(null), sizeId: 7 }).success).toBe(false);
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
