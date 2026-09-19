import { describe, expect, it } from 'vitest';

import { ONE_SIZE } from './product-content-db';
import { forgetSize, saveSize, savedSizeHistoryFor, savedSizesFor } from './saved-sizes-db';
import { STANDARD_SIZE_SET } from './size-sets-db';

/**
 * §28.3's saved sizes — one current size per size set, per account — and D6
 * applied to them.
 *
 * Each test uses its OWN account key rather than resetting the store between
 * them, on the saved items' precedent: the store is append-only and has no way to
 * forget an event, so a reset would be a second, softer definition of what it
 * does. A distinct account is exactly the isolation the tests need.
 */

function sizeIdAt(index: number): string {
  const size = STANDARD_SIZE_SET.sizes[index];
  if (size === undefined) throw new Error(`The fixture chart has no size at ${String(index)}.`);
  return size.id;
}

const MEDIUM = sizeIdAt(2);
const LARGE = sizeIdAt(3);
const FIRST = new Date('2026-09-01T10:00:00.000Z');
const SECOND = new Date('2026-09-02T10:00:00.000Z');

describe('saved sizes', () => {
  it('holds nothing for an account that has saved nothing', () => {
    expect(savedSizesFor('nobody@example.com', 'en')).toEqual([]);
  });

  it('answers with the chart and the size, named in the language asked for', () => {
    const account = 'named@example.com';
    saveSize(account, MEDIUM, 'en', FIRST);

    expect(savedSizesFor(account, 'en')).toEqual([
      {
        sizeSet: { id: STANDARD_SIZE_SET.id, name: STANDARD_SIZE_SET.name.en },
        size: { id: MEDIUM, label: 'M' },
        savedAt: FIRST.toISOString(),
      },
    ]);
    expect(savedSizesFor(account, 'ur')[0]?.sizeSet.name).toBe(STANDARD_SIZE_SET.name.ur);
  });

  it('keeps ONE current size per size set: a second size takes the first one’s place', () => {
    const account = 'supersede@example.com';
    saveSize(account, MEDIUM, 'en', FIRST);

    const answer = saveSize(account, LARGE, 'en', SECOND);

    expect(answer?.map((entry) => entry.size.id)).toEqual([LARGE]);
    expect(savedSizesFor(account, 'en').map((entry) => entry.size.id)).toEqual([LARGE]);
  });

  it('records nothing new when the size saved is already the current one', () => {
    const account = 'twice@example.com';
    saveSize(account, MEDIUM, 'en', FIRST);
    saveSize(account, MEDIUM, 'en', SECOND);

    expect(savedSizeHistoryFor(account)).toHaveLength(1);
    expect(savedSizesFor(account, 'en')[0]?.savedAt).toBe(FIRST.toISOString());
  });

  it.each([
    ['an id that is no size at all', '00000000-0000-4000-8000-000000000000'],
    ['the one size of a sizeless piece, which has no chart to save', ONE_SIZE.id],
  ])('refuses %s and records nothing', (_label, sizeId) => {
    const account = `refused-${sizeId}@example.com`;

    expect(saveSize(account, sizeId, 'en')).toBeNull();
    expect(savedSizeHistoryFor(account)).toEqual([]);
  });

  it('keeps one account’s sizes from another', () => {
    saveSize('mine@example.com', MEDIUM, 'en');
    saveSize('yours@example.com', LARGE, 'en');

    expect(savedSizesFor('mine@example.com', 'en').map((entry) => entry.size.id)).toEqual([MEDIUM]);
    expect(savedSizesFor('yours@example.com', 'en').map((entry) => entry.size.id)).toEqual([LARGE]);
  });
});

describe('forgetting a saved size', () => {
  it('stops it being current', () => {
    const account = 'forget@example.com';
    saveSize(account, MEDIUM, 'en', FIRST);

    expect(forgetSize(account, MEDIUM, 'en', SECOND)).toEqual([]);
    expect(savedSizesFor(account, 'en')).toEqual([]);
  });

  it('refuses a size that is not the current one, and leaves the current one alone', () => {
    const account = 'stale@example.com';
    saveSize(account, MEDIUM, 'en', FIRST);
    saveSize(account, LARGE, 'en', SECOND);

    // A page opened while M was saved must not forget the L it never showed.
    expect(forgetSize(account, MEDIUM, 'en')).toBeNull();
    expect(savedSizesFor(account, 'en').map((entry) => entry.size.id)).toEqual([LARGE]);
  });

  it('refuses when nothing is saved', () => {
    expect(forgetSize('empty@example.com', MEDIUM, 'en')).toBeNull();
  });

  it('lets the size be saved again afterwards, as a new fact', () => {
    const account = 'again@example.com';
    saveSize(account, MEDIUM, 'en', FIRST);
    forgetSize(account, MEDIUM, 'en', SECOND);

    const again = new Date('2026-09-03T10:00:00.000Z');
    saveSize(account, MEDIUM, 'en', again);

    expect(savedSizesFor(account, 'en')[0]?.savedAt).toBe(again.toISOString());
  });
});

/** D6 — nothing is overwritten and nothing is deleted. */
describe('saved-size provenance', () => {
  it('keeps every save and every forgetting, in order', () => {
    const account = 'history@example.com';
    saveSize(account, MEDIUM, 'en', FIRST);
    saveSize(account, LARGE, 'en', SECOND);
    forgetSize(account, LARGE, 'en', new Date('2026-09-03T10:00:00.000Z'));

    expect(savedSizeHistoryFor(account).map((event) => [event.kind, event.sizeId])).toEqual([
      ['SAVED', MEDIUM],
      ['SAVED', LARGE],
      ['FORGOTTEN', LARGE],
    ]);
  });
});
