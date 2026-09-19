import { afterEach, describe, expect, it } from 'vitest';

import { readStorage, removeStorage, writeStorage } from './browser-storage';

/** A `Storage` held in memory, so the ordinary path is exercised too (TEST-05). */
function memoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => {
      entries.clear();
    },
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => {
      entries.delete(key);
    },
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
}

/** Installs `localStorage` on the global the way a browser exposes it: as a getter. */
function installStorage(getter: () => Storage): void {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: getter });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
});

/**
 * TEST-08 — a browser that blocks site data throws a `SecurityError` on the mere
 * READ of `localStorage`. The saved list read it unguarded, from a provider in the
 * root layout, so such a visitor got an error page on every page of the store.
 */
describe('browser storage, where the browser refuses it', () => {
  it.each([
    ['blocked site data', () => new DOMException('The operation is insecure.', 'SecurityError')],
    ['no storage at all', () => new TypeError('localStorage is not defined')],
  ])('reads nothing and writes nothing when %s', (_label, failure) => {
    installStorage(() => {
      throw failure();
    });

    expect(readStorage('aa_wishlist')).toBeNull();
    expect(writeStorage('aa_wishlist', '["one"]')).toBe(false);
    expect(() => {
      removeStorage('aa_wishlist');
    }).not.toThrow();
  });

  it('keeps nothing when a write is refused because storage is full', () => {
    const full = memoryStorage();
    full.setItem = () => {
      throw new DOMException('Quota exceeded.', 'QuotaExceededError');
    };
    installStorage(() => full);

    expect(writeStorage('aa_wishlist', '["one"]')).toBe(false);
    expect(readStorage('aa_wishlist')).toBeNull();
  });
});

describe('browser storage, where the browser allows it', () => {
  it('reads back what was written, and nothing once it is removed', () => {
    const storage = memoryStorage();
    installStorage(() => storage);

    expect(writeStorage('aa_wishlist', '["one"]')).toBe(true);
    expect(readStorage('aa_wishlist')).toBe('["one"]');

    removeStorage('aa_wishlist');
    expect(readStorage('aa_wishlist')).toBeNull();
  });
});
