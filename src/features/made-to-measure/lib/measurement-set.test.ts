import { describe, expect, it } from 'vitest';

import type { MeasurementPointId } from '@/lib/domain/ids';

import { measuringOrder, pointById, pointsOf, requiredIds, stepFrom } from './measurement-set';
import { pointId, servedSet } from './test-support';

const PAIR = servedSet('KAMEEZ_SHALWAR');
const SUIT = servedSet('WAISTCOAT_SUIT');

describe("the client's order", () => {
  it('asks for the eight measurements the client listed, in their order', () => {
    // Length, Sleeves, Shoulder (Teera), Neck, Chest, Hem (Ghera), Trousers
    // (Shalwar), Trouser bottom (Poncha).
    expect(requiredIds(PAIR.points)).toEqual([
      'kameezLength',
      'kameezSleeve',
      'kameezShoulder',
      'kameezNeck',
      'kameezChest',
      'kameezBottom',
      'shalwarLength',
      'shalwarPaincha',
    ]);
  });

  it.each([PAIR, SUIT])(
    'keeps each piece of $garmentStyle together, in the order the fieldsets lay them out',
    (set) => {
      // Otherwise Tab and the stepper would leave a garment and come back to it.
      expect(measuringOrder(set.points)).toEqual(
        set.pieces.flatMap((piece) => pointsOf(set.points, piece.id).map((point) => point.id)),
      );
    },
  );

  it('asks a waistcoat suit everything a kameez shalwar asks, in the same order, then the waistcoat', () => {
    const pair = measuringOrder(PAIR.points);
    expect(measuringOrder(SUIT.points).slice(0, pair.length)).toEqual(pair);

    const waistcoat = SUIT.points.slice(pair.length);
    expect(waistcoat.map((point) => point.id)).toEqual([
      'waistcoatShoulder',
      'waistcoatChest',
      'waistcoatLength',
    ]);
    // The suit's third garment is being cut, so it cannot be left unmeasured.
    for (const point of waistcoat) expect(point.required, point.id).toBe(true);
  });
});

describe('stepping through the list one field at a time', () => {
  const order = measuringOrder(SUIT.points);

  it('moves from the last kameez measurement straight into the shalwar', () => {
    // On the whole list the sleeve opening is last; which of it and the cuff is
    // ASKED is the choices' business (`options.test.ts`).
    expect(stepFrom(order, pointId('kameezMohri'), 1)).toBe('shalwarLength');
    expect(stepFrom(order, pointId('shalwarLength'), -1)).toBe('kameezMohri');
  });

  it('stops at both ends rather than wrapping round', () => {
    expect(stepFrom(order, pointId('kameezLength'), -1)).toBeNull();
    expect(stepFrom(order, pointId('waistcoatLength'), 1)).toBeNull();
  });

  it('reaches every measurement exactly once, walking forward from the first', () => {
    const walked: MeasurementPointId[] = [];
    // Capped, so a stepper that wraps fails the test instead of hanging it.
    for (
      let id: MeasurementPointId | null = order[0] ?? null;
      id !== null && walked.length <= order.length;
      id = stepFrom(order, id, 1)
    ) {
      walked.push(id);
    }

    expect(walked).toEqual(order);
  });

  it('steps nowhere from a point the list does not carry', () => {
    // A switch of style can take the point in hand out of the list.
    const pair = measuringOrder(PAIR.points);
    expect(stepFrom(pair, pointId('waistcoatChest'), 1)).toBeNull();
    expect(pointById(PAIR.points, pointId('waistcoatChest'))).toBeUndefined();
  });
});
