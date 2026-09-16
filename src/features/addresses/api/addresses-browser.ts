import { ROUTES } from '@/config/routes';
import type { AddressDetail } from '@/lib/domain/address';
import { err, ok, type Result } from '@/lib/result';

import { addressBookSchema, type AddressBook } from '../schemas/address.schema';

export interface AddressBookError {
  /**
   * `FULL` — the book is at its ceiling; `GONE` — the address is no longer
   * held, so the page is looking at something that has since been removed.
   * Both are things a customer can act on, which is why they are told apart
   * from an ordinary failure.
   */
  readonly kind: 'UNREACHABLE' | 'SIGNED_OUT' | 'FULL' | 'GONE';
}

/**
 * The browser side of §28.3's address book: our own BFF, never Java directly.
 *
 * DATA-02 — the BFF is a network boundary like any other, so its answer is
 * PARSED rather than cast, and a body that does not match the contract is a
 * failure rather than a book of whatever arrived.
 *
 * ERR-05(1) / ERR-01 — a rejected fetch becomes a value; no try/catch for flow.
 */
async function call(
  path: string,
  init: RequestInit,
): Promise<Result<AddressBook, AddressBookError>> {
  const response = await fetch(path, {
    ...init,
    headers: { Accept: 'application/json', ...init.headers },
  }).then<Response | null, null>(
    (result) => result,
    () => null,
  );

  if (response === null) return err({ kind: 'UNREACHABLE' });
  if (response.status === 401) return err({ kind: 'SIGNED_OUT' });
  if (response.status === 409) return err({ kind: 'FULL' });
  if (response.status === 404) return err({ kind: 'GONE' });
  if (!response.ok) return err({ kind: 'UNREACHABLE' });

  const payload: unknown = await response.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  const parsed = addressBookSchema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : err({ kind: 'UNREACHABLE' });
}

const asJson = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export function readAddresses(
  signal?: AbortSignal,
): Promise<Result<AddressBook, AddressBookError>> {
  return call(ROUTES.api.addresses, { method: 'GET', signal: signal ?? null });
}

/** Saves a new address, or revises one when `addressId` is given (D6: a version). */
export function postAddress(
  address: AddressDetail,
  addressId?: string,
): Promise<Result<AddressBook, AddressBookError>> {
  return call(
    ROUTES.api.addresses,
    asJson(addressId === undefined ? { address } : { addressId, address }),
  );
}

/** D6 — the removal is recorded; the address and its date stay on file. */
export function postAddressRemoval(
  addressId: string,
): Promise<Result<AddressBook, AddressBookError>> {
  return call(ROUTES.api.addressRemoval, asJson({ addressId }));
}

export function postDefaultAddress(
  addressId: string,
): Promise<Result<AddressBook, AddressBookError>> {
  return call(ROUTES.api.addressDefault, asJson({ addressId }));
}
