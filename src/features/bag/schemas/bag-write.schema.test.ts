import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  addToBagRequestSchema,
  applyCodeRequestSchema,
  updateQuantityRequestSchema,
} from './bag-write.schema';

/**
 * Every write the bag sends passes its own contract before it leaves for the
 * backend: each kind of add, a quantity change, and a promotional code.
 */
const PIECE = 'b1c2d3e4-1111-4c8a-8f21-000000000001';
const SIZE = 'b1c2d3e4-2222-4c8a-8f21-000000000001';

describe('the bag requests', () => {
  it.each<[string, z.ZodType, unknown]>([
    [
      'a stock add',
      addToBagRequestSchema,
      {
        productId: crypto.randomUUID(),
        selections: [{ pieceId: PIECE, sizeId: SIZE }],
        quantity: 2,
      },
    ],
    [
      /* §6.1 — a product whose only piece has no size set names no size (BUG-01). */
      'a stock add of a product with no size to choose',
      addToBagRequestSchema,
      { productId: crypto.randomUUID(), selections: [], quantity: 1 },
    ],
    [
      'a made-to-measure add',
      addToBagRequestSchema,
      {
        productId: crypto.randomUUID(),
        selections: [],
        quantity: 1,
        madeToMeasureProfileId: crypto.randomUUID(),
      },
    ],
    ['a quantity change', updateQuantityRequestSchema, { quantity: 3 }],
    ['a promotional code', applyCodeRequestSchema, { code: 'EID10' }],
  ])('accepts %s', (_label, contract, input) => {
    expect(contract.safeParse(input).success).toBe(true);
  });
});
