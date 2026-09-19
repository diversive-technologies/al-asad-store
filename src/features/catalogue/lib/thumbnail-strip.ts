/**
 * MOD-04 — pure. How far a thumbnail strip scrolls to bring its current
 * thumbnail into view, kept apart from the DOM that measures it
 * (`useThumbnailFollow`) so it is tested without one.
 */

/** A box's physical inline edges, as `getBoundingClientRect` reports them. */
export interface InlineSpan {
  readonly left: number;
  readonly right: number;
}

/**
 * The PHYSICAL distance, in pixels, a strip must scroll to show its current
 * thumbnail whole — negative towards the left, positive towards the right, 0
 * when it is already in view. When it is wider than the strip, its left edge
 * wins.
 *
 * Measured from the two boxes rather than from `scrollLeft`, so the arithmetic
 * is the same in both directions: `scrollLeft` counts from the reading start and
 * runs negative under `dir="rtl"`, while a box's left and right are the screen's
 * in either, and `scrollBy` takes the same physical distance.
 */
export function stripScrollDelta(strip: InlineSpan, item: InlineSpan): number {
  if (item.left < strip.left) return item.left - strip.left;
  if (item.right > strip.right) return item.right - strip.right;
  return 0;
}
