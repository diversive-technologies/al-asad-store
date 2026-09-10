import { describe, expect, it } from 'vitest';

import { DRAWINGS } from './garment-drawings';
import {
  anchorOf,
  enteredFromStored,
  GARMENTS,
  MEASUREMENT_IDS,
  MEASUREMENTS,
  measurementsFor,
  storedFromEntered,
  type Measurement,
} from './garments';

const byId = (id: (typeof MEASUREMENT_IDS)[number]): Measurement => {
  const measurement = MEASUREMENTS.find((candidate) => candidate.id === id);
  if (measurement === undefined) throw new Error(`no measurement ${id}`);
  return measurement;
};

describe('the shape of an annotation is its arithmetic', () => {
  it('doubles a ring, because it is measured across a garment folded in half', () => {
    const chest = byId('kameezChest');
    expect(chest.annotation.shape).toBe('RING');
    expect(storedFromEntered(chest, 21)).toBe(42);
  });

  it('takes a span exactly as the tape reads it', () => {
    const shoulder = byId('kameezShoulder');
    expect(shoulder.annotation.shape).toBe('SPAN');
    expect(storedFromEntered(shoulder, 18)).toBe(18);
  });

  it('round-trips both ways, so the field and the record cannot drift apart', () => {
    for (const measurement of MEASUREMENTS) {
      expect(enteredFromStored(measurement, storedFromEntered(measurement, 30))).toBe(30);
    }
  });

  it('states its bounds on the STORED figure', () => {
    // A ring's bound is a circumference, so the field accepts half of it. Getting
    // this backwards would refuse every correct entry on six of the thirteen.
    const chest = byId('kameezChest');
    expect(enteredFromStored(chest, chest.minMm)).toBe(chest.minMm / 2);

    for (const measurement of MEASUREMENTS) {
      expect(measurement.minMm).toBeLessThan(measurement.maxMm);
    }
  });
});

describe('the set and the drawings agree', () => {
  it('holds each declared id exactly once', () => {
    expect(MEASUREMENTS.map((measurement) => measurement.id)).toEqual([...MEASUREMENT_IDS]);
  });

  it('partitions cleanly by garment, so nothing is orphaned or shown twice', () => {
    const counted = GARMENTS.flatMap((garment) => measurementsFor(garment));
    expect(counted).toHaveLength(MEASUREMENTS.length);
    expect(new Set(counted.map((measurement) => measurement.id)).size).toBe(MEASUREMENTS.length);
  });

  it('draws every garment that has measurements', () => {
    for (const garment of GARMENTS) {
      expect(DRAWINGS[garment].outline.length).toBeGreaterThan(0);
      expect(measurementsFor(garment).length).toBeGreaterThan(0);
    }
  });
});

describe('every mark lands on the drawing it belongs to', () => {
  /*
   * A coordinate typo does not throw. It puts a mark — and the button over it —
   * outside the viewBox, where it is clipped and simply cannot be pressed.
   */
  it('keeps each annotation inside its own viewBox', () => {
    for (const measurement of MEASUREMENTS) {
      const drawing = DRAWINGS[measurement.garment];
      const { annotation } = measurement;

      const [minX, maxX, minY, maxY] =
        annotation.shape === 'RING'
          ? [
              annotation.cx - annotation.rx,
              annotation.cx + annotation.rx,
              annotation.cy - annotation.ry,
              annotation.cy + annotation.ry,
            ]
          : [
              Math.min(annotation.x1, annotation.x2),
              Math.max(annotation.x1, annotation.x2),
              Math.min(annotation.y1, annotation.y2),
              Math.max(annotation.y1, annotation.y2),
            ];

      expect(minX, measurement.id).toBeGreaterThanOrEqual(0);
      expect(maxX, measurement.id).toBeLessThanOrEqual(drawing.width);
      expect(minY, measurement.id).toBeGreaterThanOrEqual(0);
      expect(maxY, measurement.id).toBeLessThanOrEqual(drawing.height);
    }
  });

  it('marks a ring ON the ring rather than in the middle of the garment', () => {
    const chest = byId('kameezChest');
    if (chest.annotation.shape !== 'RING') throw new Error('expected a ring');
    // The middle of a chest is the centre front, which is where the placket and
    // its buttons are — a dot there is taken for a button.
    expect(anchorOf(chest)).toEqual({
      x: chest.annotation.cx - chest.annotation.rx,
      y: chest.annotation.cy,
    });
  });

  it('follows a rotated ring round, so a cuff mark sits on the cuff', () => {
    const cuff = byId('kameezCuff');
    if (cuff.annotation.shape !== 'RING') throw new Error('expected a ring');
    expect(cuff.annotation.rotate).toBeDefined();

    const anchor = anchorOf(cuff);
    const distance = Math.hypot(anchor.x - cuff.annotation.cx, anchor.y - cuff.annotation.cy);
    expect(distance).toBeCloseTo(cuff.annotation.rx, 6);
    // Rotated, so it is not the axis-aligned point a horizontal ellipse would give.
    expect(anchor.y).not.toBeCloseTo(cuff.annotation.cy, 6);
  });

  it('puts a span mark on the span, off its midpoint', () => {
    const shoulder = byId('kameezShoulder');
    if (shoulder.annotation.shape !== 'SPAN') throw new Error('expected a span');

    const anchor = anchorOf(shoulder);
    expect(anchor.y).toBe(shoulder.annotation.y1);
    expect(anchor.x).toBeGreaterThan(shoulder.annotation.x1);
    expect(anchor.x).toBeLessThan((shoulder.annotation.x1 + shoulder.annotation.x2) / 2);
  });
});

describe('two marks on one garment are never mistaken for one', () => {
  /*
   * Each mark carries a 2.25rem button. Two anchors closer than this are two
   * overlapping hit areas — the later one in document order swallows part of the
   * earlier one, and the customer presses the wrong measurement with no way to
   * tell. It has happened once already: the chest ring and the kameez length
   * arrow both resolved to within fifteen units of the centre front.
   *
   * Twenty-four drawing units is roughly the width of a dot plus its air at the
   * smallest size these drawings render at.
   */
  const MINIMUM_SEPARATION = 24;

  it.each([...GARMENTS])('keeps every %s mark apart', (garment) => {
    const anchors = measurementsFor(garment).map((measurement) => ({
      id: measurement.id,
      ...anchorOf(measurement),
    }));

    for (const [index, a] of anchors.entries()) {
      for (const b of anchors.slice(index + 1)) {
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(
          MINIMUM_SEPARATION,
        );
      }
    }
  });
});
