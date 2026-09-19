/**
 * The saved list as this browser writes it down — MOD-04, React-free.
 *
 * What is stored is a JSON array of product ids in the order they were saved.
 * Anything else — nothing stored, a corrupt or hand-edited value, an array with
 * something other than ids in it — reads as the list it can honestly be, which is
 * never a reason to take a page down.
 */
export function parseLocalList(raw: string | null): string[] {
  if (raw === null) return [];

  // ERR-05(1): `JSON.parse` signals a malformed value only by throwing.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
}

/** The list with one product saved, or unsaved if it was already there. */
export function toggledLocalList(ids: readonly string[], productId: string): string[] {
  return ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId];
}
