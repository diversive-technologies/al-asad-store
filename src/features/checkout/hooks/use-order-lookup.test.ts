import { describe, expect, it } from 'vitest';

import {
  orderLookupRequestSchema,
  standaloneOrderLookupSchema,
} from '../schemas/order-lookup.schema';

describe('Order lookup schemas', () => {
  it('parses valid mobile for request schema', () => {
    const valid = orderLookupRequestSchema.safeParse({ mobile: '0300 1234567' });
    expect(valid.success).toBe(true);
  });

  it('rejects invalid mobile for request schema', () => {
    const invalid = orderLookupRequestSchema.safeParse({ mobile: '123' });
    expect(invalid.success).toBe(false);
  });

  it('parses valid orderNumber and mobile for standalone lookup', () => {
    const valid = standaloneOrderLookupSchema.safeParse({
      orderNumber: 'AA100001',
      mobile: '0300 1234567',
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.orderNumber).toBe('AA100001');
    }
  });

  it('rejects invalid orderNumber for standalone lookup', () => {
    const invalid = standaloneOrderLookupSchema.safeParse({
      orderNumber: 'AA/123/bad',
      mobile: '0300 1234567',
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects empty orderNumber for standalone lookup', () => {
    const invalid = standaloneOrderLookupSchema.safeParse({
      orderNumber: '',
      mobile: '0300 1234567',
    });
    expect(invalid.success).toBe(false);
  });
});
