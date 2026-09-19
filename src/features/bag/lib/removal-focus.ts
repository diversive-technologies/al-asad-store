import type { CartLineId } from '@/lib/domain/ids';

/**
 * MOD-04 — where keyboard focus goes once a bag line has been removed.
 *
 * The line held the Confirm button that was pressed, so when it unmounts the
 * browser drops focus to the page itself: a keyboard user is thrown back to the
 * top of the document, and a screen-reader user hears nothing at all (§30.3).
 * Focus therefore moves to a control that is still there — the Remove button of
 * the line that took the removed line's place, or of the line before it when the
 * last one went.
 *
 * @param before The lines as they were when the removal was asked for, in order.
 * @param removed The line that was removed.
 * @param after The lines the backend answered with, in order.
 * @returns The line whose Remove control should take focus, or `null` when the
 *   bag is now empty and focus belongs on the empty state instead.
 */
export function focusAfterRemoval(
  before: readonly CartLineId[],
  removed: CartLineId,
  after: readonly CartLineId[],
): CartLineId | null {
  if (after.length === 0) return null;

  const remaining = new Set(after);
  const position = before.indexOf(removed);

  /* The first line after the removed one that is still in the bag — a hold that
     lapsed while the removal was in flight is gone too, and is skipped. */
  const next = before.slice(position + 1).find((id) => remaining.has(id));
  if (position >= 0 && next !== undefined) return next;

  const previous = before
    .slice(0, Math.max(position, 0))
    .reverse()
    .find((id) => remaining.has(id));

  return previous ?? after[after.length - 1] ?? null;
}
