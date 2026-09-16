/**
 * STRUCT-04 — the feature's SERVER-facing surface.
 *
 * These reach the backend through `apiRequest`, which is `server-only`, so a
 * Client Component must not import this file. The client-safe surface is
 * `contract.ts` (STRUCT-06).
 */
export { AccountAddresses } from './components/AccountAddresses';
export {
  chooseDefaultAddress,
  fetchAddresses,
  removeAddress,
  writeAddress,
} from './api/addresses-server';
export {
  addressBookSchema,
  addressChoiceSchema,
  addressWriteSchema,
  MAX_SAVED_ADDRESSES,
  type AddressBook,
  type SavedAddress,
} from './schemas/address.schema';
