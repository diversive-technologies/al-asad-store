import { describe, expect, it } from 'vitest';

import { savedItemsBody } from '@/lib/mocks/request-bodies';

import { MAX_SAVED_ITEMS, savedItemsChangeSchema } from './saved-items.schema';

/**
 * The mock that stands in for Java states the request's wire shape for itself
 * (MOD-01), so this holds the two together, bound included.
 */
describe('a saved-items change and the body the mock backend reads', () => {
  it.each([1, MAX_SAVED_ITEMS])('passes both with %i ids', (count) => {
    const sent = savedItemsChangeSchema.safeParse({
      productIds: Array.from({ length: count }, () => crypto.randomUUID()),
    });

    expect(sent.success).toBe(true);
    expect(savedItemsBody.safeParse(sent.data).success).toBe(true);
  });

  it('is refused by the mock past the same ceiling', () => {
    const ids = Array.from({ length: MAX_SAVED_ITEMS + 1 }, () => crypto.randomUUID());

    expect(savedItemsBody.safeParse({ productIds: ids }).success).toBe(false);
  });
});
