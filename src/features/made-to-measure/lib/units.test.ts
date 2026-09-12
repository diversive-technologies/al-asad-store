import { describe, expect, it } from 'vitest';

import {
  DEFAULT_UNIT,
  formatFigure,
  normaliseDigits,
  parseEntry,
  reconcileEntry,
  showEntry,
  type TypedEntry,
  type Unit,
} from './units';

describe('units', () => {
  it('offers inches first, because that is what this market measures in', () => {
    expect(DEFAULT_UNIT).toBe('IN');
  });

  it('shows two decimals of an inch and one of a centimetre, trailing zeros dropped', () => {
    // Tailors write quarter inches; a tenth of a centimetre is a millimetre.
    expect(formatFigure(8.25, 'IN')).toBe('8.25');
    expect(formatFigure(40, 'IN')).toBe('40');
    expect(formatFigure(21.6535, 'IN')).toBe('21.65');
    expect(formatFigure(101.6, 'CM')).toBe('101.6');
  });

  it('reads a typed figure, and nothing that is not one', () => {
    expect(parseEntry('19.5')).toBe(19.5);
    expect(parseEntry(' 19.5 ')).toBe(19.5);
    expect(parseEntry('')).toBeNull();
    expect(parseEntry('   ')).toBeNull();
    expect(parseEntry('abc')).toBeNull();
    expect(parseEntry('3..5')).toBeNull();
  });

  it('reads only what a tape gives — no hex, no exponent, no sign', () => {
    expect(parseEntry('0x15')).toBeNull();
    expect(parseEntry('2.1e1')).toBeNull();
    expect(parseEntry('+19.5')).toBeNull();
    expect(parseEntry('-5')).toBeNull();
    expect(parseEntry('18.125')).toBeNull();
  });

  it("reads an Urdu keyboard's digits as the same figure", () => {
    expect(parseEntry('۱۹٫۵')).toBe(19.5);
    expect(parseEntry('١٩.٥')).toBe(19.5);
  });

  it("reads a card's fractions as the decimals the contract takes", () => {
    expect(parseEntry('19½')).toBe(19.5);
    expect(parseEntry('19 1/2')).toBe(19.5);
    expect(parseEntry('19-1/2')).toBe(19.5);
    expect(parseEntry('8¾')).toBe(8.75);
    expect(parseEntry('14¼')).toBe(14.25);
    expect(normaliseDigits('۱۹½')).toBe('19.5');
  });
});

describe('switching units never rewrites what was typed', () => {
  /** One unit switch, as the studio performs it on one field. */
  function switchUnit(
    entry: TypedEntry | undefined,
    lastShown: string | undefined,
    current: string,
    from: Unit,
    to: Unit,
  ): { readonly entry: TypedEntry; readonly shown: string } {
    const next = reconcileEntry(entry, lastShown, current, from);
    return { entry: next, shown: showEntry(next, to) };
  }

  it('keeps a tailor’s 8.25 through any number of switches', () => {
    let entry: TypedEntry | undefined;
    let shown: string | undefined;
    let current = '8.25';
    let unit: Unit = 'IN';

    for (let round = 0; round < 6; round += 1) {
      const to: Unit = unit === 'IN' ? 'CM' : 'IN';
      const result = switchUnit(entry, shown, current, unit, to);
      entry = result.entry;
      shown = result.shown;
      current = result.shown;
      unit = to;
    }

    expect(unit).toBe('IN');
    expect(current).toBe('8.25');
  });

  it('shows the figure converted in the other unit', () => {
    expect(showEntry({ raw: '40', unit: 'IN' }, 'CM')).toBe('101.6');
    expect(showEntry({ raw: '40', unit: 'IN' }, 'IN')).toBe('40');
  });

  it('treats typing in the new unit as the new original', () => {
    const typed = reconcileEntry(undefined, undefined, '40', 'IN');
    const inCentimetres = showEntry(typed, 'CM');
    const retyped = reconcileEntry(typed, inCentimetres, '102', 'CM');

    expect(retyped).toEqual({ raw: '102', unit: 'CM' });
    expect(showEntry(retyped, 'IN')).toBe('40.16');
  });

  it('leaves a blank field blank, and keeps half-typed text for when its unit returns', () => {
    expect(showEntry({ raw: '', unit: 'IN' }, 'CM')).toBe('');
    // A 0 in place of nonsense would count as a measurement taken.
    expect(showEntry({ raw: '3..5', unit: 'IN' }, 'CM')).toBe('');
    expect(showEntry({ raw: '3..5', unit: 'IN' }, 'IN')).toBe('3..5');
  });
});
