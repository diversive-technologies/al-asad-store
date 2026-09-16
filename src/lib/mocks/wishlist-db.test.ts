import { describe, expect, it } from 'vitest';

import { removeItem, saveItem, saveItems, savedHistoryFor, savedItemsFor } from './wishlist-db';

/**
 * §28.3's saved items, and D6 applied to them.
 *
 * Each test uses its OWN account key rather than resetting the store between
 * them. The store is append-only by design and has no way to forget a row, so a
 * reset would be a second, softer definition of what the module does — and the
 * isolation these tests actually need is exactly what a distinct account buys.
 */
describe('saved items', () => {
  it('keeps the order the customer saved in', () => {
    const account = 'order@example.com';

    saveItem(account, 'p-1');
    saveItem(account, 'p-2');
    saveItem(account, 'p-3');

    expect(savedItemsFor(account)).toEqual(['p-1', 'p-2', 'p-3']);
  });

  it('leaves an item already saved exactly where it was', () => {
    const account = 'again@example.com';

    saveItems(account, ['p-1', 'p-2']);
    saveItem(account, 'p-1');

    // Not ['p-2', 'p-1'] — re-saving must not reorder a list the customer built.
    expect(savedItemsFor(account)).toEqual(['p-1', 'p-2']);
    expect(savedHistoryFor(account)).toHaveLength(2);
  });

  it('one account cannot see the list of another', () => {
    saveItem('mine@example.com', 'p-1');
    saveItem('yours@example.com', 'p-2');

    expect(savedItemsFor('mine@example.com')).toEqual(['p-1']);
    expect(savedItemsFor('yours@example.com')).toEqual(['p-2']);
  });

  describe('D6 provenance', () => {
    it('records a removal and keeps the row on file', () => {
      const account = 'removal@example.com';

      saveItem(account, 'p-1', new Date('2026-09-01T10:00:00.000Z'));
      removeItem(account, 'p-1', new Date('2026-09-02T10:00:00.000Z'));

      expect(savedItemsFor(account)).toEqual([]);

      const history = savedHistoryFor(account);
      expect(history).toHaveLength(1);
      expect(history[0]?.savedAt).toBe('2026-09-01T10:00:00.000Z');
      expect(history[0]?.removedAt).toBe('2026-09-02T10:00:00.000Z');
    });

    it('starts a NEW row when a removed item is saved again', () => {
      const account = 'resave@example.com';

      saveItem(account, 'p-1', new Date('2026-09-01T10:00:00.000Z'));
      removeItem(account, 'p-1', new Date('2026-09-02T10:00:00.000Z'));
      saveItem(account, 'p-1', new Date('2026-09-03T10:00:00.000Z'));

      expect(savedItemsFor(account)).toEqual(['p-1']);

      // The removal survives: it is part of what happened, not a state to undo.
      const history = savedHistoryFor(account);
      expect(history).toHaveLength(2);
      expect(history[0]?.removedAt).toBe('2026-09-02T10:00:00.000Z');
      expect(history[1]?.removedAt).toBeNull();
    });

    it('removing something never saved changes nothing', () => {
      const account = 'absent@example.com';

      expect(removeItem(account, 'p-1')).toEqual([]);
      expect(savedHistoryFor(account)).toHaveLength(0);
    });
  });
});
