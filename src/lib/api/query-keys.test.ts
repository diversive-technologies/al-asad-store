import { describe, expect, it } from 'vitest';

import { queryKeys } from './query-keys';

/**
 * TEST-08 — F11: the order's cache entry was keyed by its number alone, and
 * signing out is a soft navigation the cache survives, so the next person at a
 * shared browser was served the previous customer's order with no request made.
 * Whoever reads an order is part of its key, as with the saved items.
 */
describe('queryKeys.checkout.order', () => {
  it.each([
    ['another account', 'someone@example.com'],
    ['a guest after sign-out', ''],
  ])('is a different entry for %s', (_label, reader) => {
    expect(queryKeys.checkout.order('AA100001', reader)).not.toEqual(
      queryKeys.checkout.order('AA100001', 'customer@example.com'),
    );
  });

  it('stays under the checkout keys, so a sweep of them still reaches it', () => {
    expect(queryKeys.checkout.order('AA100001', '').slice(0, 1)).toEqual(queryKeys.checkout.all);
  });
});
