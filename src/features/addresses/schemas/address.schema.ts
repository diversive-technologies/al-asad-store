import { z } from 'zod';

import { addressDetailSchema } from '@/lib/domain/address';
import { addressIdSchema } from '@/lib/domain/ids';

/**
 * §28.3's saved addresses, as the account holds them.
 *
 * The four fields come from `lib/domain/address.ts`, which checkout validates
 * against too — the plan's requirement that nothing is validated twice.
 *
 * SEC-02 — the ceiling is on the wire, because the length of a served list is
 * untrusted input however friendly the sender looks. The mock holds the same
 * bound on the way in, as a stand-in for Java that has no business trusting its
 * caller either.
 */
export const MAX_SAVED_ADDRESSES = 20;

export const savedAddressSchema = addressDetailSchema.extend({
  id: addressIdSchema,
  savedAt: z.iso.datetime(),
  /**
   * Exactly one address in a non-empty book carries this, and the SERVER decides
   * which. A client that worked it out itself would be a second copy of a rule
   * the backend already applies (DATA-13), and the two would disagree the first
   * time a default was chosen in another tab.
   */
  isDefault: z.boolean(),
});

export const addressBookSchema = z.object({
  addresses: z.array(savedAddressSchema).max(MAX_SAVED_ADDRESSES),
});

/** What the browser asks to save, or to revise when it names an id. */
export const addressWriteSchema = z.object({
  addressId: addressIdSchema.optional(),
  address: addressDetailSchema,
});

/** Naming one address: removing it, or making it the default. */
export const addressChoiceSchema = z.object({ addressId: addressIdSchema });

export type SavedAddress = z.infer<typeof savedAddressSchema>;
export type AddressBook = z.infer<typeof addressBookSchema>;
export type AddressWrite = z.infer<typeof addressWriteSchema>;
