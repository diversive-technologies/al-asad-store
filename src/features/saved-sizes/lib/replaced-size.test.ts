import { describe, expect, it } from 'vitest';

import { sizeIdSchema, sizeSetIdSchema, type SizeId, type SizeSetId } from '@/lib/domain/ids';

import type { SavedSize } from '../schemas/saved-size.schema';
import { replacedSize } from './replaced-size';

/**
 * What "in place of M" names — read from the server's list before and after a
 * save, never predicted, since which chart a size belongs to is the backend's.
 */

const CLOTHING = sizeSetIdSchema.parse('00000000-0000-4000-8000-0000000000aa');
const WAIST = sizeSetIdSchema.parse('00000000-0000-4000-8000-0000000000bb');
const M = sizeIdSchema.parse('00000000-0000-4000-8000-000000000002');
const L = sizeIdSchema.parse('00000000-0000-4000-8000-000000000003');
const W32 = sizeIdSchema.parse('00000000-0000-4000-8000-000000000032');

function saved(sizeSetId: SizeSetId, sizeId: SizeId, label: string): SavedSize {
  return {
    sizeSet: { id: sizeSetId, name: 'Chart' },
    size: { id: sizeId, label },
    savedAt: '2026-09-01T10:00:00.000Z',
  };
}

describe('replacedSize', () => {
  it.each([
    ['nothing, when the chart held nothing before', [], [saved(CLOTHING, M, 'M')], M, null],
    [
      'the size the chart held before',
      [saved(CLOTHING, M, 'M')],
      [saved(CLOTHING, L, 'L')],
      L,
      'M',
    ],
    [
      'nothing, when the same size was saved again',
      [saved(CLOTHING, M, 'M')],
      [saved(CLOTHING, M, 'M')],
      M,
      null,
    ],
    [
      'nothing, when the size before belonged to a different chart',
      [saved(WAIST, W32, '32')],
      [saved(WAIST, W32, '32'), saved(CLOTHING, M, 'M')],
      M,
      null,
    ],
    [
      'nothing, when the answer does not hold the size at all',
      [saved(CLOTHING, M, 'M')],
      [],
      L,
      null,
    ],
  ])('names %s', (_label, before, after, sizeId, expected) => {
    expect(replacedSize(before, after, sizeId)).toBe(expected);
  });
});
