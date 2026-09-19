import type { SizeId } from '@/lib/domain/ids';

import type { SavedSize } from '../schemas/saved-size.schema';

/**
 * The label of the saved size a save took the place of, or `null` when it
 * replaced nothing.
 *
 * MOD-04 — pure, and read from the two lists the SERVER answered rather than
 * predicted: which size set a size belongs to, and that a set holds one current
 * size, are the backend's rules (DATA-13). This only compares what was on file
 * for the saved size's set before the save with what is on file after it, so the
 * confirmation can say "in place of M" whenever — and only when — that happened,
 * including when M is not a size of the product on screen.
 */
export function replacedSize(
  before: readonly SavedSize[],
  after: readonly SavedSize[],
  sizeId: SizeId,
): string | null {
  const saved = after.find((entry) => entry.size.id === sizeId);
  if (saved === undefined) return null;

  const previous = before.find((entry) => entry.sizeSet.id === saved.sizeSet.id);
  return previous === undefined || previous.size.id === sizeId ? null : previous.size.label;
}
