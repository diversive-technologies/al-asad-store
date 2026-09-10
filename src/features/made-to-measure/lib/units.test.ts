import { describe, expect, it } from 'vitest';

import { convertEntry, DEFAULT_UNIT, fromMm, toMm } from './units';

describe('ADR 16 — the record is integer millimetres', () => {
  it('offers inches first, because that is what this market measures in', () => {
    expect(DEFAULT_UNIT).toBe('IN');
  });

  it('converts both ways', () => {
    expect(toMm(40, 'IN')).toBe(1016);
    expect(toMm(101.6, 'CM')).toBe(1016);
    expect(fromMm(1016, 'IN')).toBe(40);
    expect(fromMm(1016, 'CM')).toBe(102);
  });

  it('stores whole millimetres', () => {
    expect(Number.isInteger(toMm(37.5, 'IN'))).toBe(true);
    expect(Number.isInteger(toMm(33.3, 'CM'))).toBe(true);
  });

  it('shows a tenth of an inch and a whole centimetre, and no more', () => {
    // A tape reads to about an eighth of an inch; three decimal places would be
    // a precision the measurement never had.
    expect(fromMm(1000, 'IN')).toBe(39.4);
    expect(fromMm(1004, 'CM')).toBe(100);
  });
});

describe('flipping the unit toggle', () => {
  it('goes through millimetres rather than scaling what is on screen', () => {
    // 40 in is 1016 mm is 102 cm. Scaling the displayed number would give 101.6
    // and disagree with the record by the rounding.
    expect(convertEntry('40', 'IN', 'CM')).toBe('102');
    expect(convertEntry('102', 'CM', 'IN')).toBe('40.2');
  });

  it('leaves an unanswered field empty rather than writing a zero into it', () => {
    // A 0 here would count as a measurement taken and satisfy nothing.
    expect(convertEntry('', 'IN', 'CM')).toBe('');
    expect(convertEntry('   ', 'IN', 'CM')).toBe('');
  });

  it('discards half-typed nonsense instead of carrying NaN into the next unit', () => {
    expect(convertEntry('abc', 'IN', 'CM')).toBe('');
    expect(convertEntry('3..5', 'CM', 'IN')).toBe('');
  });

  it('is a no-op between the same unit', () => {
    expect(convertEntry('38.5', 'IN', 'IN')).toBe('38.5');
  });
});
