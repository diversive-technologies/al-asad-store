import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import { orderLookupBody, placeBody } from '@/lib/mocks/request-bodies';

import { orderLookupRequestSchema } from './order-lookup.schema';
import {
  placeOrderReplySchema,
  placeOrderRequestSchema,
  placeOrderResultSchema,
} from './place-order.schema';

/**
 * The mock that stands in for Java states each request's wire shape for itself
 * (MOD-01), so this holds the two together: every request checkout's contract
 * accepts must be a body the mock accepts.
 */
describe('the checkout requests and the bodies the mock backend reads', () => {
  it.each<[string, z.ZodType, z.ZodType, unknown]>([
    [
      'a placement',
      placeOrderRequestSchema,
      placeBody,
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
    ['a lookup by mobile', orderLookupRequestSchema, orderLookupBody, { mobile: '03001234567' }],
  ])('%s passes both', (_label, contract, mock, input) => {
    const sent = contract.safeParse(input);

    expect(sent.success).toBe(true);
    expect(mock.safeParse(sent.data).success).toBe(true);
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
