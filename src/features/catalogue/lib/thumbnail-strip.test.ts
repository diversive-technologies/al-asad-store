import { describe, expect, it } from 'vitest';

import { stripScrollDelta } from './thumbnail-strip';

/**
 * The gallery's thumbnail strip keeps its current thumbnail in view by scrolling
 * itself alone. On a phone the page's strip reopened, after the full-screen view,
 * on a thumbnail scrolled out of sight. The distance is PHYSICAL — boxes as the
 * screen draws them — so one rule serves both reading directions: under
 * `dir="rtl"` the strip starts at the right, and the thumbnails further along it
 * are the ones off its left edge.
 */

/** A 343px strip, as a 375px phone draws it inside the page gutter. */
const STRIP = { left: 16, right: 359 };

describe('stripScrollDelta', () => {
  it.each([
    ['nothing when the thumbnail is already whole in view', { left: 104, right: 184 }, 0],
    ['towards the right, past a thumbnail cut off at the right', { left: 336, right: 416 }, 57],
    ['towards the left, past a thumbnail cut off at the left (RTL)', { left: -60, right: 20 }, -76],
    ['to the left edge first, for a thumbnail wider than the strip', { left: -8, right: 400 }, -24],
  ])('scrolls %s', (_case, thumbnail, delta) => {
    expect(stripScrollDelta(STRIP, thumbnail)).toBe(delta);
  });
});
