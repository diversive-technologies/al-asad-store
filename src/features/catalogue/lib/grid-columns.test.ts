import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_SIZE } from '../schemas/search.schema';
import {
  DEFAULT_MOBILE_COLUMNS,
  GRID_COLUMN_COUNTS,
  MOBILE_COLUMN_OPTIONS,
  parseMobileColumns,
} from './grid-columns';

/**
 * The one property this module exists to hold, and the one that fails SILENTLY:
 * nothing throws when a page size does not divide by a column count. It shows up
 * as a gap in the last row on one particular monitor width, which is why it went
 * unnoticed at 1920px for as long as it did.
 */
describe('page size divides by every column count', () => {
  it.each(GRID_COLUMN_COUNTS)('fills every row at %i columns', (columns) => {
    expect(DEFAULT_PAGE_SIZE % columns).toBe(0);
  });

  it('rejects a count the page size cannot fill', () => {
    // The guard itself, checked against the count that was actually removed:
    // 24 / 5 = 4.8, so a five-column grid ended each page four tiles short.
    expect(DEFAULT_PAGE_SIZE % 5).not.toBe(0);
    expect(GRID_COLUMN_COUNTS).not.toContain(5);
  });

  it('offers only counts the grid can actually render', () => {
    for (const option of MOBILE_COLUMN_OPTIONS) {
      expect(GRID_COLUMN_COUNTS).toContain(option);
    }
  });
});

describe('parseMobileColumns', () => {
  it('accepts every offered count', () => {
    for (const option of MOBILE_COLUMN_OPTIONS) {
      expect(parseMobileColumns(String(option))).toBe(option);
    }
  });

  it('falls back to the default for anything else', () => {
    // SEC-02: the cookie is untrusted, and its value reaches an attribute
    // selector. A count that is not offered, a non-number and an injection
    // attempt all have to land on the default rather than in the DOM.
    for (const raw of [undefined, '', '0', '5', '99', 'two', '2; rm', '[data-x]']) {
      expect(parseMobileColumns(raw)).toBe(DEFAULT_MOBILE_COLUMNS);
    }
  });
});
