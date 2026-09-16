/**
 * STRUCT-06 — the address book's CLIENT-SAFE barrel.
 *
 * `index.ts` reaches the backend through `apiRequest`, which is `server-only`,
 * so a Client Component importing it fails the build outright. Checkout's
 * picker and the managed book are here instead.
 */
export { AddressBookScreen } from './components/AddressBookScreen';
export { SaveAddressOffer } from './components/SaveAddressOffer';
export { SavedAddressPicker } from './components/SavedAddressPicker';
export { useAddresses, type AddressBookState } from './hooks/use-addresses';
export type { SavedAddress } from './schemas/address.schema';
