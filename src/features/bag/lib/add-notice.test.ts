import { describe, expect, it } from 'vitest';

import { pieceIdSchema } from '@/lib/domain/ids';

import type { BagSummary } from '../schemas/bag.schema';
import type { AddToBagResult } from '../schemas/bag-write.schema';
import { EMPTY_BAG } from './empty-bag';
import { addNoticeFor } from './add-notice';

const WORDS = {
  unavailable: '{piece} in size {size} is gone.',
  measurementsRefused: 'measurements refused',
  selectionRefused: 'selection refused',
};

const SUMMARY: BagSummary = EMPTY_BAG;

describe('addNoticeFor', () => {
  it.each<[string, AddToBagResult, string | null]>([
    ['an add', { kind: 'ADDED', summary: SUMMARY }, null],
    [
      'a piece that ran out, naming it',
      {
        kind: 'UNAVAILABLE',
        pieceId: pieceIdSchema.parse('b1c2d3e4-1111-4c8a-8f21-000000000001'),
        pieceName: 'Shalwar',
        sizeLabel: 'L',
      },
      'Shalwar in size L is gone.',
    ],
    ['refused measurements', { kind: 'MEASUREMENTS_REFUSED' }, 'measurements refused'],
    ['a refused selection', { kind: 'SELECTION_REFUSED' }, 'selection refused'],
  ])('answers %s with its own words', (_label, result, expected) => {
    expect(addNoticeFor(result, WORDS)).toBe(expected);
  });
});
