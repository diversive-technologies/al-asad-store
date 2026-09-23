import type { AddressDetail } from '@/lib/domain/address';

/**
 * D1 — §28.3's saved addresses, standing in for Java: one book per ACCOUNT.
 *
 * Account-keyed, like the saved items and for the same reason: an address book
 * belongs to a customer, and a guest has no account for one to belong to.
 * §2.1 says as much — "saved addresses" is on the Customer row and not on the
 * Visitor's. A guest still checks out (§28.2); they simply type the address.
 *
 * D6 — nothing is deleted and nothing is overwritten. An address has a STABLE
 * id and a version: editing it appends the next version and marks the one
 * before `supersededBy`, exactly as a measurement profile does. Removing it
 * records `removedAt` on the current version. The book is what survives that
 * filtering, which means every address the customer has ever held, and every
 * correction they made to one, stays answerable.
 *
 * Supersession is keyed on (account, ADDRESS ID) rather than on the contents,
 * which is the lesson the measurement profiles paid for: a supersession rule
 * has to be keyed on the same identity the read matches on, or it hides records
 * instead of replacing them.
 */

interface AddressRow {
  readonly accountKey: string;
  /** Stable across every version — this is what an edit revises. */
  readonly addressId: string;
  readonly version: number;
  readonly detail: AddressDetail;
  readonly savedAt: string;
  /** The version that replaced this one, or null while it is current. */
  supersededBy: number | null;
  removedAt: string | null;
}

/**
 * Which address is the default, recorded as an EVENT rather than as a column.
 *
 * A mutable `isDefault` flag would be the first field in the mock layer that is
 * overwritten in place, and "the customer changed their default on Tuesday" is
 * exactly the kind of fact D6 exists to keep. The current default is the latest
 * event still pointing at a live address.
 */
interface DefaultEvent {
  readonly accountKey: string;
  readonly addressId: string;
  readonly at: string;
}

const ADDRESSES: AddressRow[] = [];
const DEFAULTS: DefaultEvent[] = [];

/** D1 serverless — an account's address versions and its default events. */
export function addressRowsOf(accountKey: string): readonly AddressRow[] {
  return ADDRESSES.filter((row) => row.accountKey === accountKey);
}

export function defaultEventsOf(accountKey: string): readonly DefaultEvent[] {
  return DEFAULTS.filter((row) => row.accountKey === accountKey);
}

/**
 * D1 serverless — put both back.
 *
 * The address id and its VERSION are the identity: a correction is the next
 * version of the same id, so matching on the pair is what keeps an edit from
 * being restored as a second address.
 */
export function adoptAddressRows(
  rows: readonly AddressRow[],
  defaults: readonly DefaultEvent[],
): void {
  for (const row of rows) {
    const held = ADDRESSES.some(
      (other) =>
        other.accountKey === row.accountKey &&
        other.addressId === row.addressId &&
        other.version === row.version,
    );
    if (!held) ADDRESSES.push({ ...row, detail: { ...row.detail } });
  }

  for (const event of defaults) {
    const held = DEFAULTS.some(
      (other) =>
        other.accountKey === event.accountKey &&
        other.addressId === event.addressId &&
        other.at === event.at,
    );
    if (!held) DEFAULTS.push({ ...event });
  }
}

/** Test seam — a cold instance holds no addresses. */
export function resetAddresses(): void {
  ADDRESSES.length = 0;
  DEFAULTS.length = 0;
}

/**
 * SEC-02 — a book has a ceiling, because the count is untrusted input. Twenty
 * is past what anyone has and short of what would make the picker unusable.
 */
export const MAX_ADDRESSES = 20;

export interface SavedAddress extends AddressDetail {
  readonly id: string;
  readonly savedAt: string;
  readonly isDefault: boolean;
}

/**
 * The current version of each address this account holds, in BOOK order.
 *
 * Book order is when the address was first saved, not when its latest version
 * was written — otherwise correcting a typo in the first address would send it
 * to the bottom of the list, which is the book quietly re-ordering itself under
 * somebody who only fixed a spelling.
 */
function liveRows(accountKey: string): AddressRow[] {
  const firstSeen = new Map<string, number>();
  ADDRESSES.forEach((row, index) => {
    if (row.accountKey !== accountKey || firstSeen.has(row.addressId)) return;
    firstSeen.set(row.addressId, index);
  });

  return ADDRESSES.filter(
    (row) => row.accountKey === accountKey && row.supersededBy === null && row.removedAt === null,
  ).sort(
    (one, other) => (firstSeen.get(one.addressId) ?? 0) - (firstSeen.get(other.addressId) ?? 0),
  );
}

const liveRow = (accountKey: string, addressId: string): AddressRow | undefined =>
  liveRows(accountKey).find((row) => row.addressId === addressId);

/**
 * Which address is default right now.
 *
 * The latest event still pointing at a live address wins. If no event does —
 * nothing has ever been chosen, or every chosen address has since gone — the
 * FIRST address stands in, so the invariant "exactly one default while any
 * exist" holds without a repair step and without a write on a read.
 */
function defaultIdFor(accountKey: string): string | null {
  const live = liveRows(accountKey);
  if (live.length === 0) return null;

  for (let index = DEFAULTS.length - 1; index >= 0; index -= 1) {
    const event = DEFAULTS[index];
    if (event === undefined || event.accountKey !== accountKey) continue;
    if (live.some((row) => row.addressId === event.addressId)) return event.addressId;
  }

  return live[0]?.addressId ?? null;
}

/**
 * The book, oldest first.
 *
 * The order is the one they were saved in, like the saved items: it is the
 * customer's own sequence and sorting it by anything else would discard it.
 */
export function addressesFor(accountKey: string): SavedAddress[] {
  const defaultId = defaultIdFor(accountKey);
  return liveRows(accountKey).map((row) => ({
    id: row.addressId,
    ...row.detail,
    savedAt: row.savedAt,
    isDefault: row.addressId === defaultId,
  }));
}

/** Saves a new address. The first one saved becomes the default, being the only one. */
export function saveAddress(
  accountKey: string,
  detail: AddressDetail,
  addressId: string,
  now: Date = new Date(),
): SavedAddress[] | 'FULL' {
  if (liveRows(accountKey).length >= MAX_ADDRESSES) return 'FULL';

  ADDRESSES.push({
    accountKey,
    addressId,
    version: 1,
    detail,
    savedAt: now.toISOString(),
    supersededBy: null,
    removedAt: null,
  });

  if (liveRows(accountKey).length === 1) {
    DEFAULTS.push({ accountKey, addressId, at: now.toISOString() });
  }

  return addressesFor(accountKey);
}

/**
 * Corrects an address: the next version of the SAME address, never an overwrite.
 *
 * It keeps its id, so it keeps its place in the book and keeps being the
 * default if it was — a customer fixing a typo in their own street has not
 * chosen a different address.
 */
export function reviseAddress(
  accountKey: string,
  addressId: string,
  detail: AddressDetail,
  now: Date = new Date(),
): SavedAddress[] | null {
  const current = liveRow(accountKey, addressId);
  if (current === undefined) return null;

  const next = current.version + 1;
  current.supersededBy = next;
  ADDRESSES.push({
    accountKey,
    addressId,
    version: next,
    detail,
    savedAt: now.toISOString(),
    supersededBy: null,
    removedAt: null,
  });

  return addressesFor(accountKey);
}

/**
 * D6 — records that the address was removed; the row and its date stay on file.
 *
 * If it was the default, the most recently saved survivor takes over, recorded
 * as its own event. Leaving a book with no default would make the next checkout
 * offer nothing to pre-fill.
 */
export function removeAddress(
  accountKey: string,
  addressId: string,
  now: Date = new Date(),
): SavedAddress[] | null {
  const current = liveRow(accountKey, addressId);
  if (current === undefined) return null;

  const wasDefault = defaultIdFor(accountKey) === addressId;
  current.removedAt = now.toISOString();

  const survivors = liveRows(accountKey);
  const heir = survivors[survivors.length - 1];
  if (wasDefault && heir !== undefined) {
    DEFAULTS.push({ accountKey, addressId: heir.addressId, at: now.toISOString() });
  }

  return addressesFor(accountKey);
}

/** Chooses the default. An address that is not in the book cannot become it. */
export function makeDefault(
  accountKey: string,
  addressId: string,
  now: Date = new Date(),
): SavedAddress[] | null {
  if (liveRow(accountKey, addressId) === undefined) return null;

  DEFAULTS.push({ accountKey, addressId, at: now.toISOString() });
  return addressesFor(accountKey);
}

/** Every row ever written for one account, superseded and removed included. */
export function addressHistoryFor(accountKey: string): readonly AddressRow[] {
  return ADDRESSES.filter((row) => row.accountKey === accountKey);
}
