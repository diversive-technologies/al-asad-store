import { describe, expect, it } from 'vitest';

import { pieceIdSchema } from '@/lib/domain/ids';

import { bagLineSchema, type BagSummary } from '../schemas/bag.schema';
import { EMPTY_BAG } from './empty-bag';
import {
  lineChangeFailure,
  lineChangeOutcome,
  type LineChangeAnswer,
  type LineChangeOutcome,
  type LineChangeRequest,
} from './line-change-outcome';

const WORDS = {
  unavailable: '{piece} in size {size} is gone.',
  removedStatus: '{item} removed.',
  movedStatus: '{item} moved to saved items.',
  moveNotInBag: 'already gone, nothing saved',
  moveNotMovable: 'cut lines stay',
  moveSignedOut: 'sign in again',
  updateFailed: 'try again',
  quantityStatus: '{item} now {count}.',
};

const SUMMARY = EMPTY_BAG;
const ITEM = 'Plain Waistcoat Suit';

/** The line changed, as the bag that came back holds it: at THREE. */
const HELD = bagLineSchema.parse({
  id: 'a1b2c3d4-0001-4c8a-8f21-000000000001',
  productId: 'b1b2c3d4-0001-4c8a-8f21-000000000001',
  slug: 'plain-waistcoat-suit',
  name: ITEM,
  imageUrl: '/products/example.avif',
  type: 'SIMPLE',
  quantity: 3,
  unitPriceMinor: 700_000,
  lineTotalMinor: 2_100_000,
  pieces: [
    {
      pieceId: 'c1b2c3d4-0001-4c8a-8f21-000000000001',
      name: 'Kameez',
      sizeId: 'd1b2c3d4-0001-4c8a-8f21-000000000001',
      sizeLabel: 'M',
    },
  ],
  reservationExpiresAt: '2026-09-17T12:00:00.000Z',
  stitching: null,
  movableToWishlist: true,
});
const LINE = { id: HELD.id, name: ITEM };
const HOLDING: BagSummary = { ...EMPTY_BAG, lines: [HELD], heldUntil: HELD.reservationExpiresAt };
const NOTHING: LineChangeOutcome = {
  summary: null,
  notice: null,
  status: null,
  lineLeft: false,
  savedItemsChanged: false,
};

describe('lineChangeOutcome', () => {
  it.each<[string, LineChangeAnswer, LineChangeOutcome]>([
    [
      /* TEST-08 — §30.3: this used to say nothing, and the count changed in place
         with nothing announced. The figure is the one the BACKEND now holds. */
      'a quantity change keeps the bag and says the quantity it now holds',
      { request: 'QUANTITY', result: { kind: 'ADDED', summary: HOLDING } },
      { ...NOTHING, summary: HOLDING, status: `${ITEM} now 3.` },
    ],
    [
      'a quantity change whose line is not in the bag that came back claims no figure',
      { request: 'QUANTITY', result: { kind: 'ADDED', summary: SUMMARY } },
      { ...NOTHING, summary: SUMMARY },
    ],
    [
      'a raise past the shelf names the piece and keeps the bag as it was',
      {
        request: 'QUANTITY',
        result: {
          kind: 'UNAVAILABLE',
          pieceId: pieceIdSchema.parse('b1c2d3e4-1111-4c8a-8f21-000000000001'),
          pieceName: 'Shalwar',
          sizeLabel: 'L',
        },
      },
      { ...NOTHING, notice: 'Shalwar in size L is gone.' },
    ],
    [
      'a removal says which line went, and moves focus',
      { request: 'REMOVE', result: { kind: 'ADDED', summary: SUMMARY } },
      { ...NOTHING, summary: SUMMARY, status: `${ITEM} removed.`, lineLeft: true },
    ],
    [
      'a move says where the line went, moves focus and stales the saved items',
      { request: 'MOVE_TO_WISHLIST', result: { kind: 'MOVED', summary: SUMMARY } },
      {
        summary: SUMMARY,
        notice: null,
        status: `${ITEM} moved to saved items.`,
        lineLeft: true,
        savedItemsChanged: true,
      },
    ],
    [
      /* The line is gone from the bag that came back, so focus must still move —
         but nothing was saved, so the saved items are not stale and no status claims it. */
      'a move of a line already gone says nothing was saved',
      { request: 'MOVE_TO_WISHLIST', result: { kind: 'NOT_IN_BAG', summary: SUMMARY } },
      { ...NOTHING, summary: SUMMARY, notice: 'already gone, nothing saved', lineLeft: true },
    ],
    [
      'a refused move of a cut line keeps the line and says why',
      { request: 'MOVE_TO_WISHLIST', result: { kind: 'NOT_MOVABLE' } },
      { ...NOTHING, notice: 'cut lines stay' },
    ],
  ])('%s', (_label, answer, expected) => {
    expect(lineChangeOutcome(answer, LINE, WORDS, 'en')).toEqual(expected);
  });
});

describe('lineChangeFailure', () => {
  it.each<[LineChangeRequest['kind'], 'UNAVAILABLE' | 'SIGNED_OUT', string]>([
    ['MOVE_TO_WISHLIST', 'SIGNED_OUT', 'sign in again'],
    ['MOVE_TO_WISHLIST', 'UNAVAILABLE', 'try again'],
    ['REMOVE', 'UNAVAILABLE', 'try again'],
    ['QUANTITY', 'SIGNED_OUT', 'try again'],
  ])('a %s that failed with %s says "%s"', (request, kind, expected) => {
    expect(lineChangeFailure(request, { kind }, WORDS)).toBe(expected);
  });
});
