/**
 * D1 — §28.3's saved items, standing in for Java: one list per ACCOUNT.
 *
 * Keyed by the account alone, because that is the whole point of moving it here:
 * a saved item belongs to the customer rather than to the browser they happened
 * to be using. A guest has no account for it to belong to, so a guest's list
 * stays in their own browser and never reaches this store.
 *
 * D6 — nothing is deleted. Un-hearting RECORDS a removal on the row, and saving
 * the same product again appends a NEW row rather than resurrecting the removed
 * one, exactly as the bag does with a line the customer took out: the removal is
 * part of what happened, and a list that quietly rewrote its own history could
 * not answer when something was saved.
 */

interface SavedRow {
  readonly accountKey: string;
  readonly productId: string;
  readonly savedAt: string;
  removedAt: string | null;
}

const SAVED: SavedRow[] = [];

/** D1 serverless — every row this account holds, removals included (D6). */
export function savedRowsOf(accountKey: string): readonly SavedRow[] {
  return SAVED.filter((row) => row.accountKey === accountKey);
}

/** D1 serverless — put an account's rows back, skipping any already held. */
export function adoptSavedRows(rows: readonly SavedRow[]): void {
  for (const row of rows) {
    const held = SAVED.some(
      (other) =>
        other.accountKey === row.accountKey &&
        other.productId === row.productId &&
        other.savedAt === row.savedAt,
    );
    if (!held) SAVED.push({ ...row });
  }
}

/** Test seam — a cold instance has saved nothing. */
export function resetSavedItems(): void {
  SAVED.length = 0;
}

const activeRows = (accountKey: string): SavedRow[] =>
  SAVED.filter((row) => row.accountKey === accountKey && row.removedAt === null);

/**
 * What this account has saved, oldest first.
 *
 * The ORDER is the customer's own — the sequence they saved things in — and it
 * is the one piece of meaning the list carries beyond its membership, so it is
 * served rather than sorted.
 */
export function savedItemsFor(accountKey: string): string[] {
  return activeRows(accountKey).map((row) => row.productId);
}

/** Saves one product. Saving something already saved changes nothing. */
export function saveItem(accountKey: string, productId: string, now: Date = new Date()): string[] {
  const held = activeRows(accountKey).some((row) => row.productId === productId);
  if (!held) {
    SAVED.push({ accountKey, productId, savedAt: now.toISOString(), removedAt: null });
  }
  return savedItemsFor(accountKey);
}

/** D6 — records that the item was removed; the row and its date stay on file. */
export function removeItem(
  accountKey: string,
  productId: string,
  now: Date = new Date(),
): string[] {
  for (const row of activeRows(accountKey)) {
    if (row.productId === productId) row.removedAt = now.toISOString();
  }
  return savedItemsFor(accountKey);
}

/**
 * Saves several at once, keeping the order they arrive in.
 *
 * This is what a customer's browser-held list becomes when they sign in: it is
 * offered to the account ONCE, and anything already saved is left alone rather
 * than moved to the end, so a merge cannot reorder a list the customer built.
 */
export function saveItems(
  accountKey: string,
  productIds: readonly string[],
  now: Date = new Date(),
): string[] {
  for (const productId of productIds) saveItem(accountKey, productId, now);
  return savedItemsFor(accountKey);
}

/** Every row ever written for one account, removals included — D6's record. */
export function savedHistoryFor(accountKey: string): readonly SavedRow[] {
  return SAVED.filter((row) => row.accountKey === accountKey);
}
