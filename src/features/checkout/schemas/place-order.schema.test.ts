import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import { orderLookupRequestSchema } from './order-lookup.schema';
import {
  placeOrderReplySchema,
  placeOrderRequestSchema,
  placeOrderResultSchema,
} from './place-order.schema';

/**
 * Each request checkout sends passes its own contract before it leaves for the
 * backend: a placement as the form fills it in, and an order lookup by mobile.
 */
describe('the checkout requests', () => {
  it.each<[string, z.ZodType, unknown]>([
    [
      'a placement',
      placeOrderRequestSchema,
      {
        contactName: 'Test Customer',
        contactMobile: '0300 1234567',
        contactEmail: '',
        addressLine: '12 Example Street, Block A',
        addressCity: 'Lahore',
        deliveryOptionId: 'standard',
        paymentMethodId: 'cod',
        isGift: true,
        giftMessage: 'Eid Mubarak',
        expectedTotalMinor: 725_000,
      },
    ],
    ['a lookup by mobile', orderLookupRequestSchema, { mobile: '03001234567' }],
  ])('accepts %s', (_label, contract, input) => {
    expect(contract.safeParse(input).success).toBe(true);
  });
});

describe('the placed answer', () => {
  const refusal = { kind: 'PAYMENT_FAILED', reason: 'Not available.' };

  it('requires the access token from the backend, and a refusal carries none', () => {
    expect(placeOrderReplySchema.safeParse(refusal).success).toBe(true);
    expect(placeOrderResultSchema.safeParse(refusal).success).toBe(true);
  });

  it.each(['../x', 'short', ''])('refuses an access token shaped like %j', (token) => {
    const reply = { kind: 'PLACED', order: {}, accessToken: token };

    expect(placeOrderReplySchema.safeParse(reply).success).toBe(false);
  });
});
