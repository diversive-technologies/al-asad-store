import { describe, expect, it } from 'vitest';

import type { AddressDetail } from '@/lib/domain/address';

import {
  addressHistoryFor,
  addressesFor,
  makeDefault,
  MAX_ADDRESSES,
  removeAddress,
  reviseAddress,
  saveAddress,
} from './addresses-db';

/**
 * §28.3's address book, and D6 applied to it.
 *
 * Each test uses its OWN account key rather than resetting the store between
 * them. The store is append-only by design and has no way to forget a row, so a
 * reset would be a second, softer definition of what the module does — and the
 * isolation these tests need is exactly what a distinct account buys.
 */
const detail = (line: string, city = 'Lahore'): AddressDetail => ({
  recipientName: 'Ali Raza',
  recipientMobile: '0300 1234567',
  line,
  city,
});

describe('address book', () => {
  it('keeps the order they were saved in', () => {
    const account = 'order@example.com';

    saveAddress(account, detail('House 1, Street A'), 'a-1');
    saveAddress(account, detail('House 2, Street B'), 'a-2');

    expect(addressesFor(account).map((one) => one.line)).toEqual([
      'House 1, Street A',
      'House 2, Street B',
    ]);
  });

  it('one account cannot see the book of another', () => {
    saveAddress('mine@example.com', detail('Mine'), 'm-1');
    saveAddress('yours@example.com', detail('Yours'), 'y-1');

    expect(addressesFor('mine@example.com')).toHaveLength(1);
    expect(addressesFor('mine@example.com')[0]?.line).toBe('Mine');
    expect(addressesFor('yours@example.com')[0]?.line).toBe('Yours');
  });

  it('refuses a book past its ceiling rather than growing without bound', () => {
    const account = 'full@example.com';
    for (let index = 0; index < MAX_ADDRESSES; index += 1) {
      saveAddress(account, detail(`House ${String(index)}, Street`), `f-${String(index)}`);
    }

    expect(addressesFor(account)).toHaveLength(MAX_ADDRESSES);
    expect(saveAddress(account, detail('One too many'), 'f-over')).toBe('FULL');
    expect(addressesFor(account)).toHaveLength(MAX_ADDRESSES);
  });

  describe('the default', () => {
    it('is the first address saved, there being nothing else it could be', () => {
      const account = 'first@example.com';
      saveAddress(account, detail('Only one'), 'd-1');

      expect(addressesFor(account)[0]?.isDefault).toBe(true);
    });

    it('stays where it was when another address is added', () => {
      const account = 'stays@example.com';
      saveAddress(account, detail('First'), 's-1');
      saveAddress(account, detail('Second'), 's-2');

      const book = addressesFor(account);
      expect(book.filter((one) => one.isDefault).map((one) => one.id)).toEqual(['s-1']);
    });

    it('moves when it is chosen, and exactly one carries it', () => {
      const account = 'choose@example.com';
      saveAddress(account, detail('First'), 'c-1');
      saveAddress(account, detail('Second'), 'c-2');
      makeDefault(account, 'c-2');

      const book = addressesFor(account);
      expect(book.filter((one) => one.isDefault).map((one) => one.id)).toEqual(['c-2']);
    });

    it('cannot be given to an address the account does not hold', () => {
      const account = 'stranger@example.com';
      saveAddress(account, detail('Mine'), 'x-1');

      expect(makeDefault(account, 'not-mine')).toBeNull();
      expect(addressesFor(account)[0]?.isDefault).toBe(true);
    });

    it('passes to a survivor when the default is removed', () => {
      const account = 'heir@example.com';
      saveAddress(account, detail('First'), 'h-1');
      saveAddress(account, detail('Second'), 'h-2');

      removeAddress(account, 'h-1');

      const book = addressesFor(account);
      expect(book.map((one) => one.id)).toEqual(['h-2']);
      expect(book[0]?.isDefault).toBe(true);
    });
  });

  describe('D6 provenance', () => {
    it('corrects an address as a NEW VERSION, keeping its id and its place', () => {
      const account = 'revise@example.com';
      saveAddress(
        account,
        detail('Hose 12, Street 4'),
        'r-1',
        new Date('2026-09-01T10:00:00.000Z'),
      );
      saveAddress(account, detail('Second'), 'r-2');

      reviseAddress(
        account,
        'r-1',
        detail('House 12, Street 4'),
        new Date('2026-09-02T10:00:00.000Z'),
      );

      const book = addressesFor(account);
      // Same id, same position, corrected line — not a third entry.
      expect(book.map((one) => one.id)).toEqual(['r-1', 'r-2']);
      expect(book[0]?.line).toBe('House 12, Street 4');
      expect(book[0]?.isDefault).toBe(true);

      // The typo survives on file: three rows written, one of them superseded.
      const history = addressHistoryFor(account);
      expect(history).toHaveLength(3);
      const first = history.find((row) => row.addressId === 'r-1' && row.version === 1);
      expect(first?.detail.line).toBe('Hose 12, Street 4');
      expect(first?.supersededBy).toBe(2);
    });

    it('records a removal and keeps the row with its date', () => {
      const account = 'removal@example.com';
      saveAddress(account, detail('Gone'), 'g-1', new Date('2026-09-01T10:00:00.000Z'));
      removeAddress(account, 'g-1', new Date('2026-09-03T10:00:00.000Z'));

      expect(addressesFor(account)).toEqual([]);

      const history = addressHistoryFor(account);
      expect(history).toHaveLength(1);
      expect(history[0]?.removedAt).toBe('2026-09-03T10:00:00.000Z');
      expect(history[0]?.detail.line).toBe('Gone');
    });

    it('will not revise or remove an address that has already gone', () => {
      const account = 'twice@example.com';
      saveAddress(account, detail('Once'), 't-1');
      removeAddress(account, 't-1');

      expect(reviseAddress(account, 't-1', detail('Again'))).toBeNull();
      expect(removeAddress(account, 't-1')).toBeNull();
      expect(addressHistoryFor(account)).toHaveLength(1);
    });
  });
});
