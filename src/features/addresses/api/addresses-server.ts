import 'server-only';

import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { API_HEADERS } from '@/lib/api/headers';
import type { AddressDetail } from '@/lib/domain/address';
import type { Result } from '@/lib/result';

import { addressBookSchema, type AddressBook } from '../schemas/address.schema';

/**
 * §28.3's address book, for whoever is signed in.
 *
 * The account is read from the SESSION by the caller and attached as a header,
 * never taken from the request the browser sent: a book that named its own owner
 * would let any browser read or write any customer's addresses.
 *
 * DATA-09 — uncacheable, and not only because it is per-customer: the owner
 * travels in a header and Next's data cache is keyed on the request, so a cached
 * entry would be shared between customers.
 */
function withAccount<T>(
  accountKey: string,
  call: (headers: Record<string, string>) => Promise<Result<T, ApiError>>,
): Promise<Result<T, ApiError>> {
  return call({ [API_HEADERS.accountKey]: accountKey });
}

export function fetchAddresses(accountKey: string): Promise<Result<AddressBook, ApiError>> {
  return withAccount(accountKey, (headers) =>
    apiRequest({
      path: ENDPOINTS.account.addresses,
      headers,
      schema: addressBookSchema,
      next: { revalidate: 0 },
    }),
  );
}

/**
 * Saves a new address, or revises one when `addressId` is given.
 *
 * A revision is the next VERSION of that address (D6), which is why it travels
 * on the same path as a save rather than on one of its own: what the customer
 * did is "this is my address", and whether it replaces a row is the backend's
 * business.
 */
export function writeAddress(
  accountKey: string,
  address: AddressDetail,
  addressId?: string,
): Promise<Result<AddressBook, ApiError>> {
  return withAccount(accountKey, (headers) =>
    apiRequest({
      path: ENDPOINTS.account.addresses,
      method: 'POST',
      body: addressId === undefined ? { address } : { addressId, address },
      headers,
      schema: addressBookSchema,
      next: { revalidate: 0 },
    }),
  );
}

/** D6 — records that the address was removed; nothing is destroyed. */
export function removeAddress(
  accountKey: string,
  addressId: string,
): Promise<Result<AddressBook, ApiError>> {
  return withAccount(accountKey, (headers) =>
    apiRequest({
      path: ENDPOINTS.account.addressRemoval,
      method: 'POST',
      body: { addressId },
      headers,
      schema: addressBookSchema,
      next: { revalidate: 0 },
    }),
  );
}

/** Chooses which address checkout offers first. */
export function chooseDefaultAddress(
  accountKey: string,
  addressId: string,
): Promise<Result<AddressBook, ApiError>> {
  return withAccount(accountKey, (headers) =>
    apiRequest({
      path: ENDPOINTS.account.addressDefault,
      method: 'POST',
      body: { addressId },
      headers,
      schema: addressBookSchema,
      next: { revalidate: 0 },
    }),
  );
}
