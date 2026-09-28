import { describe, expect, it } from 'vitest';

import { MAX_SAVED_ITEMS, savedItemsChangeSchema } from './saved-items.schema';

/**
 * What the browser may ask to save or to remove in one change, bound included:
 * the storefront refuses past the ceiling before anything is sent (SEC-02).
 */
describe('a saved-items change', () => {
  it.each([1, MAX_SAVED_ITEMS])('is accepted with %i ids', (count) => {
    const change = { productIds: Array.from({ length: count }, () => crypto.randomUUID()) };

    expect(savedItemsChangeSchema.safeParse(change).success).toBe(true);
  });

  it('is refused past the ceiling', () => {
    const ids = Array.from({ length: MAX_SAVED_ITEMS + 1 }, () => crypto.randomUUID());

    expect(savedItemsChangeSchema.safeParse({ productIds: ids }).success).toBe(false);
  });
});
