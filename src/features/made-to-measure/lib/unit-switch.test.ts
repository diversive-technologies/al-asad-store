import { describe, expect, it } from 'vitest';

import { checkSubmission } from '@/lib/mocks/profiles-db';

import { servedSet } from './test-support';
import { NOTHING_HELD, switchUnit, typedEntriesOf } from './unit-switch';

const PAIR = servedSet('KAMEEZ_SHALWAR').points;

describe('a unit switch across every figure the form holds', () => {
  it('converts a figure kept from another style, and brings it back exactly', () => {
    // The waistcoat chest was typed on the suit; the pair's list does not show it.
    const toCm = switchUnit(
      PAIR,
      { kameezChest: '21', waistcoatChest: '20' },
      NOTHING_HELD,
      'IN',
      'CM',
    );
    expect(toCm.display).toMatchObject({ kameezChest: '53.3', waistcoatChest: '50.8' });

    const back = switchUnit(PAIR, toCm.display, toCm.held, 'CM', 'IN');
    expect(back.display).toMatchObject({ kameezChest: '21', waistcoatChest: '20' });
  });

  it('takes new typing in the new unit as the new original', () => {
    const toCm = switchUnit(PAIR, { kameezChest: '21' }, NOTHING_HELD, 'IN', 'CM');
    const back = switchUnit(PAIR, { ...toCm.display, kameezChest: '55' }, toCm.held, 'CM', 'IN');

    expect(back.display.kameezChest).toBe('21.65');
    expect(back.held.typed.kameezChest).toEqual({ raw: '55', unit: 'CM' });
  });

  it('never shows a point on screen a figure it would refuse', () => {
    // 33 cm is 12.992 in, which rounds to 12.99 beside the neck's 13 in minimum.
    const toIn = switchUnit(PAIR, { kameezNeck: '33' }, NOTHING_HELD, 'CM', 'IN');
    expect(toIn.display.kameezNeck).toBe('13');
  });

  it('leaves an empty field empty', () => {
    expect(switchUnit(PAIR, { kameezCuff: '' }, NOTHING_HELD, 'IN', 'CM').display).toEqual({
      kameezCuff: '',
    });
  });
});

describe('what is sent for a save', () => {
  it('sends a figure as it was typed, in its own unit, whichever unit is showing', () => {
    const toCm = switchUnit(PAIR, { kameezChest: '19.5' }, NOTHING_HELD, 'IN', 'CM');
    expect(typedEntriesOf(PAIR, toCm.display, toCm.held, 'CM')).toEqual([
      { pointId: 'kameezChest', raw: '19.5', unit: 'IN' },
    ]);
  });

  it('so 19.5 in across records 991 mm with centimetres on screen', () => {
    const toCm = switchUnit(PAIR, { kameezChest: '19.5' }, NOTHING_HELD, 'IN', 'CM');
    const sent = typedEntriesOf(PAIR, toCm.display, toCm.held, 'CM');
    const { recorded } = checkSubmission({
      garmentStyle: 'KAMEEZ_SHALWAR',
      source: 'GARMENT_COPY',
      version: 1,
      entries: sent.map((entry) => ({ ...entry })),
      preferences: [],
      acknowledgedFindings: [],
    });
    expect(recorded).toContainEqual({ pointId: 'kameezChest', valueMm: 991 });
  });

  it("sends an Urdu keyboard's digits as the ASCII the contract reads", () => {
    expect(typedEntriesOf(PAIR, { kameezChest: '۱۹٫۵' }, NOTHING_HELD, 'IN')).toEqual([
      { pointId: 'kameezChest', raw: '19.5', unit: 'IN' },
    ]);
  });

  it('sends new typing in its unit, and nothing for an empty field or a kept figure', () => {
    expect(
      typedEntriesOf(
        PAIR,
        { kameezChest: ' 50 ', kameezCuff: '', waistcoatChest: '20' },
        NOTHING_HELD,
        'CM',
      ),
    ).toEqual([{ pointId: 'kameezChest', raw: '50', unit: 'CM' }]);
  });
});
