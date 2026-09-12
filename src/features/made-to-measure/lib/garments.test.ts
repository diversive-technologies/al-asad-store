import { describe, expect, it } from 'vitest';

import type { Geometry } from '../schemas/measurement-set.schema';
import { DRAWING_IDS, DRAWINGS } from './garment-drawings';
import { anchorOf, enteredFromStored, readingOf, storedFromEntered } from './garments';
import { EVERY_POINT, pointOf } from './test-support';

const drawn = (id: string): Geometry => {
  const { geometry } = pointOf(id);
  if (geometry === null) throw new Error(`${id} has no mark`);
  return geometry;
};

describe('how a figure is written decides the arithmetic', () => {
  it('doubles a figure written as a half, measured across a garment folded in half', () => {
    expect(storedFromEntered(pointOf('kameezChest'), 19.5)).toBe(39);
  });

  it('records a full figure exactly as the tape reads it', () => {
    expect(storedFromEntered(pointOf('kameezShoulder'), 18)).toBe(18);
    // A neck is a GIRTH, but it is read whole on the opened band.
    expect(storedFromEntered(pointOf('kameezNeck'), 15.5)).toBe(15.5);
  });

  it('round-trips both ways, so the field and the record cannot drift apart', () => {
    for (const point of EVERY_POINT) {
      expect(enteredFromStored(point, storedFromEntered(point, 30))).toBe(30);
    }
  });

  it('states its bounds on the STORED figure', () => {
    // A half figure's bound is a circumference, so the field accepts half of it.
    // Getting this backwards would refuse every correct entry on every half point.
    const chest = pointOf('kameezChest');
    expect(enteredFromStored(chest, chest.minMm)).toBe(chest.minMm / 2);
  });
});

describe('the reading follows the arithmetic, never the drawn shape', () => {
  it('never tells anyone to double a girth that is read in full', () => {
    const neck = pointOf('kameezNeck');
    expect([neck.kind, neck.enteredAs]).toEqual(['GIRTH', 'FULL']);
    expect(readingOf(neck)).toBe('FULL_GIRTH');

    for (const point of EVERY_POINT) {
      expect(readingOf(point) === 'HALF_GIRTH', point.id).toBe(point.enteredAs === 'HALF');
    }
  });
});

describe('where a mark sits', () => {
  it('marks a ring ON the ring rather than in the middle of the garment', () => {
    const ring = drawn('kameezChest');
    if (ring.shape !== 'RING') throw new Error('expected a ring');
    // The middle of a chest is the centre front, which is where the placket and
    // its buttons are — a dot there is taken for a button.
    expect(anchorOf(ring)).toEqual({ x: ring.cx - ring.rx, y: ring.cy });
  });

  it('follows a rotated ring round, so a cuff mark sits on the cuff', () => {
    const cuff = drawn('kameezCuff');
    if (cuff.shape !== 'RING') throw new Error('expected a ring');
    expect(cuff.rotate).toBeDefined();

    const anchor = anchorOf(cuff);
    expect(Math.hypot(anchor.x - cuff.cx, anchor.y - cuff.cy)).toBeCloseTo(cuff.rx, 6);
    // Rotated, so it is not the axis-aligned point a horizontal ellipse would give.
    expect(anchor.y).not.toBeCloseTo(cuff.cy, 6);
  });

  it('puts a span mark on the span, off its midpoint', () => {
    const span = drawn('kameezShoulder');
    if (span.shape !== 'SPAN') throw new Error('expected a span');

    const anchor = anchorOf(span);
    expect(anchor.y).toBe(span.y1);
    expect(anchor.x).toBeGreaterThan(span.x1);
    expect(anchor.x).toBeLessThan((span.x1 + span.x2) / 2);
  });
});

describe('the emblem each garment wears off the studio', () => {
  it.each([...DRAWING_IDS])('keeps the %s emblem inside its own drawing', (id) => {
    const { emblem, width, height } = DRAWINGS[id];
    expect(emblem.cx - emblem.rx).toBeGreaterThanOrEqual(0);
    expect(emblem.cx + emblem.rx).toBeLessThanOrEqual(width);
    expect(emblem.cy - emblem.ry).toBeGreaterThanOrEqual(0);
    expect(emblem.cy + emblem.ry).toBeLessThanOrEqual(height);
  });
});
