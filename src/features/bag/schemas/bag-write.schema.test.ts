import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import { addItemBody, codeBody, quantityBody } from '@/lib/mocks/request-bodies';

import {
  addToBagRequestSchema,
  applyCodeRequestSchema,
  updateQuantityRequestSchema,
} from './bag-write.schema';

/**
 * The mock that stands in for Java states each request's wire shape for itself
 * (MOD-01 keeps `lib/` from importing a feature), so this holds the two together:
 * every request the bag's contract accepts must be a body the mock accepts.
 */
const PIECE = 'b1c2d3e4-1111-4c8a-8f21-000000000001';
const SIZE = 'b1c2d3e4-2222-4c8a-8f21-000000000001';

describe('the bag requests and the bodies the mock backend reads', () => {
  it.each<[string, z.ZodType, z.ZodType, unknown]>([
    [
      'a stock add',
      addToBagRequestSchema,
      addItemBody,
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
      addItemBody,
      { productId: crypto.randomUUID(), selections: [], quantity: 1 },
    ],
    [
      'a made-to-measure add',
      addToBagRequestSchema,
      addItemBody,
      {
        productId: crypto.randomUUID(),
        selections: [],
        quantity: 1,
        madeToMeasureProfileId: crypto.randomUUID(),
      },
    ],
    ['a quantity change', updateQuantityRequestSchema, quantityBody, { quantity: 3 }],
    ['a promotional code', applyCodeRequestSchema, codeBody, { code: 'EID10' }],
  ])('%s passes both', (_label, contract, mock, input) => {
    const sent = contract.safeParse(input);

    expect(sent.success).toBe(true);
    expect(mock.safeParse(sent.data).success).toBe(true);
  });
});
