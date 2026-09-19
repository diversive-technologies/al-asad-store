import { describe, expect, it } from 'vitest';

import { cartLineIdSchema, type CartLineId } from '@/lib/domain/ids';

import { focusAfterRemoval } from './removal-focus';

/**
 * TEST-08 — removing a bag line used to leave focus nowhere: the pressed Confirm
 * button unmounted with its line, and the bag never moved focus anywhere else
 * (fixNow 42). This pins where it goes instead.
 */

const [a, b, c, d] = [
  'a1b2c3d4-0001-4c8a-8f21-000000000001',
  'a1b2c3d4-0001-4c8a-8f21-000000000002',
  'a1b2c3d4-0001-4c8a-8f21-000000000003',
  'a1b2c3d4-0001-4c8a-8f21-000000000004',
].map((value) => cartLineIdSchema.parse(value)) as [CartLineId, CartLineId, CartLineId, CartLineId];

describe('focusAfterRemoval', () => {
  it.each([
    {
      label: 'the line that took its place',
      before: [a, b, c],
      removed: b,
      after: [a, c],
      expected: c,
    },
    {
      label: 'the line before, when the last went',
      before: [a, b, c],
      removed: c,
      after: [a, b],
      expected: b,
    },
    { label: 'the only line left', before: [a, b], removed: a, after: [b], expected: b },
    {
      label: 'past a line that lapsed meanwhile',
      before: [a, b, c, d],
      removed: b,
      after: [a, d],
      expected: d,
    },
    { label: 'back past a lapsed line', before: [a, b, c], removed: c, after: [a], expected: a },
  ])('lands on $label', ({ before, removed, after, expected }) => {
    expect(focusAfterRemoval(before, removed, after)).toBe(expected);
  });

  it('answers null when the bag is empty, so focus goes to the empty state', () => {
    expect(focusAfterRemoval([a], a, [])).toBeNull();
  });

  it('still lands on a line when the removed one was never on screen', () => {
    expect(focusAfterRemoval([a, b], c, [a, b])).toBe(b);
  });
});
