import { describe, expect, it } from 'vitest';

import { formatPriceInput, parsePriceInput } from './price-input';

describe('parsePriceInput', () => {
  it('converts a rupee figure to integer minor units', () => {
    expect(parsePriceInput('3499')).toBe(349_900);
  });

  it('keeps paisa precision for a fractional figure', () => {
    expect(parsePriceInput('34.99')).toBe(3499);
  });

  it('rounds rather than truncating below one paisa', () => {
    expect(parsePriceInput('34.999')).toBe(3500);
  });

  it('reads a cleared box as no bound, not as zero', () => {
    // The whole reason the field is nullable: `0` would stay in the URL forever.
    expect(parsePriceInput('')).toBeNull();
    expect(parsePriceInput('   ')).toBeNull();
  });

  it('tolerates surrounding whitespace', () => {
    expect(parsePriceInput('  3499 ')).toBe(349_900);
  });

  it('discards a figure that is not a number', () => {
    expect(parsePriceInput('12abc')).toBeNull();
    expect(parsePriceInput('abc')).toBeNull();
  });

  it('discards a negative bound rather than taking its magnitude', () => {
    expect(parsePriceInput('-5')).toBeNull();
  });

  it('discards Infinity, which Number accepts', () => {
    expect(parsePriceInput('Infinity')).toBeNull();
  });

  it('accepts an explicit zero as a real bound', () => {
    expect(parsePriceInput('0')).toBe(0);
  });
});

describe('formatPriceInput', () => {
  it('renders minor units as a plain major-unit figure', () => {
    expect(formatPriceInput(349_900)).toBe('3499');
  });

  it('renders no bound as an empty box', () => {
    expect(formatPriceInput(null)).toBe('');
  });

  it('keeps a fractional amount readable', () => {
    expect(formatPriceInput(3499)).toBe('34.99');
  });

  it('round-trips through parsePriceInput', () => {
    for (const minor of [0, 3499, 349_900, 1_250_000]) {
      expect(parsePriceInput(formatPriceInput(minor))).toBe(minor);
    }
  });
});
