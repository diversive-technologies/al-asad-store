import { describe, expect, it } from 'vitest';

import { piecesLeftUnasked, type CoverageList } from './choice-coverage';

type Condition = { readonly group: string; readonly values: readonly string[] };

const on = (group: string, ...values: string[]): Condition => ({ group, values });
const point = (pieceId: string, askedWhen: Condition | null = null) => ({ pieceId, askedWhen });
const choice = (id: string, values: readonly string[], appliesWhen: Condition | null = null) => ({
  id,
  appliesWhen,
  values: values.map((value) => ({ id: value })),
});

const SLEEVE = choice('sleeve', ['CUFF', 'PLAIN']);
const CUFF_STYLE = choice('cuffStyle', ['SINGLE', 'DOUBLE'], on('sleeve', 'CUFF'));

/** A kameez measured as the case says, beside a shalwar that is always asked. */
const kameez = (
  points: CoverageList['points'],
  options: CoverageList['options'],
): CoverageList => ({
  pieces: [{ id: 'KAMEEZ' }, { id: 'SHALWAR' }],
  points: [...points, point('SHALWAR')],
  options,
});

/* Thirty-two choices, each applying under either value of the one before, whose
   values ask nothing until the last. Tried combination by combination, that is
   four billion lists of choices. */
const CHAIN = [
  choice('c0', ['A', 'B']),
  ...Array.from({ length: 31 }, (_, index) =>
    choice(`c${String(index + 1)}`, ['A', 'B'], on(`c${String(index)}`, 'A', 'B')),
  ),
];

/*
 * TEST-08 — the contract accepted a list whose finishing choices could ask
 * nothing on a garment: a customer choosing a plain sleeve on such a list met an
 * empty form, and the workshop a garment with no figures.
 */
describe('which garments the finishing choices can leave with nothing asked', () => {
  it.each([
    [
      'a point asked whatever is chosen',
      [point('KAMEEZ'), point('KAMEEZ', on('sleeve', 'CUFF'))],
      [SLEEVE],
    ],
    [
      'every value of a choice asking something',
      [point('KAMEEZ', on('sleeve', 'CUFF')), point('KAMEEZ', on('sleeve', 'PLAIN'))],
      [SLEEVE],
    ],
    [
      'a nested choice whose every value asks, under a parent that asks when it is off',
      [
        point('KAMEEZ', on('sleeve', 'PLAIN')),
        point('KAMEEZ', on('cuffStyle', 'SINGLE')),
        point('KAMEEZ', on('cuffStyle', 'DOUBLE')),
      ],
      [SLEEVE, CUFF_STYLE],
    ],
    [
      'the last of thirty-two chained choices asking either way',
      [point('KAMEEZ', on('c31', 'A', 'B'))],
      CHAIN,
    ],
  ])('leaves no garment empty with %s', (_, points, options) => {
    expect(piecesLeftUnasked(kameez(points, options))).toEqual([]);
  });

  it.each([
    ['a value that asks nothing', [point('KAMEEZ', on('sleeve', 'CUFF'))], [SLEEVE]],
    [
      'a nested choice with a value that asks nothing',
      [point('KAMEEZ', on('sleeve', 'PLAIN')), point('KAMEEZ', on('cuffStyle', 'SINGLE'))],
      [SLEEVE, CUFF_STYLE],
    ],
    [
      'a parent that takes the only asking choice out of play',
      [point('KAMEEZ', on('cuffStyle', 'SINGLE')), point('KAMEEZ', on('cuffStyle', 'DOUBLE'))],
      [SLEEVE, CUFF_STYLE],
    ],
    [
      'the last of thirty-two chained choices asking only one way',
      [point('KAMEEZ', on('c31', 'A'))],
      CHAIN,
    ],
  ])('names the garment for %s', (_, points, options) => {
    expect(piecesLeftUnasked(kameez(points, options))).toEqual([0]);
  });

  it('names only the garment that can be left empty', () => {
    const shalwarOnlyWithCuff: CoverageList = {
      pieces: [{ id: 'KAMEEZ' }, { id: 'SHALWAR' }],
      points: [point('KAMEEZ'), point('SHALWAR', on('sleeve', 'CUFF'))],
      options: [SLEEVE],
    };

    expect(piecesLeftUnasked(shalwarOnlyWithCuff)).toEqual([1]);
  });
});
