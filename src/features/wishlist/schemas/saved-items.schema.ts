import { z } from 'zod';

import { productIdSchema } from '@/lib/domain/ids';

/**
 * §28.3's saved items, as the account holds them.
 *
 * A list of product ids and nothing else. What each id IS — name, price, whether
 * it is still sold — is the catalogue's to answer and is read separately (§8.2),
 * so a saved list cannot go stale against the catalogue or carry a price that was
 * true when it was saved.
 *
 * SEC-02 — the ceiling is on the wire, because the length of a served list is
 * untrusted input however friendly the sender looks. It is far above any real
 * saved list, and the BFF holds the same bound on the way in.
 */
export const MAX_SAVED_ITEMS = 100;

export const savedItemsSchema = z.object({
  ids: z.array(productIdSchema).max(MAX_SAVED_ITEMS),
});

/** What the browser asks to save or to remove. */
export const savedItemsChangeSchema = z.object({
  productIds: z.array(productIdSchema).min(1).max(MAX_SAVED_ITEMS),
});

export type SavedItems = z.infer<typeof savedItemsSchema>;
export type SavedItemsChange = z.infer<typeof savedItemsChangeSchema>;
