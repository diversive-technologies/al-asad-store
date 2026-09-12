import { describe, expect, it } from 'vitest';

import { measurementSetSchema, type MeasurementSet } from '../schemas/measurement-set.schema';
import { sanitizeMarks } from './marks';

const span = (x1: number, y1: number, x2: number, y2: number) => ({
  shape: 'SPAN',
  x1,
  y1,
  x2,
  y2,
});

interface TestPoint {
  readonly id: string;
  readonly pieceId: 'KAMEEZ' | 'SHALWAR';
  readonly geometry: unknown;
  readonly kind?: 'GIRTH' | 'LENGTH';
  readonly askedWhen?: unknown;
}

/* The garments are the ones the points name, each drawn as itself, so a list
   never declares a garment with nothing on it. */
function served(points: readonly TestPoint[], options: unknown[] = []): MeasurementSet {
  return measurementSetSchema.parse({
    garmentStyle: 'TEST_STYLE',
    source: 'GARMENT_COPY',
    sources: ['GARMENT_COPY'],
    version: 1,
    pieces: [...new Set(points.map((point) => point.pieceId))].map((id) => ({
      id,
      drawingId: id,
    })),
    points: points.map((point) => ({
      kind: 'LENGTH',
      enteredAs: 'FULL',
      basis: 'GARMENT',
      termKey: null,
      required: true,
      minMm: 100,
      maxMm: 200,
      askedWhen: null,
      ...point,
    })),
    options,
  });
}

describe('the marks a served list may draw', () => {
  it('drops a mark that falls off its drawing, and keeps the point', () => {
    // The kameez is drawn 260 units tall, so this span runs off its hem.
    const { set, dropped } = sanitizeMarks(
      served([{ id: 'a', pieceId: 'KAMEEZ', geometry: span(10, 10, 10, 400) }]),
    );

    expect(dropped).toEqual([{ pointId: 'a', reason: 'OUTSIDE_DRAWING' }]);
    expect(set.points).toHaveLength(1);
    expect(set.points[0].geometry).toBeNull();
  });

  it('measures a ring as it is drawn, turned', () => {
    // Unturned, this ring spans y 5–15 and fits; turned a quarter it spans y −20
    // to 40, and its mark would sit above the drawing.
    const ring = { shape: 'RING', cx: 100, cy: 10, rx: 30, ry: 5 };
    const turned = sanitizeMarks(
      served([{ id: 'a', pieceId: 'KAMEEZ', kind: 'GIRTH', geometry: { ...ring, rotate: 90 } }]),
    );
    const level = sanitizeMarks(
      served([{ id: 'a', pieceId: 'KAMEEZ', kind: 'GIRTH', geometry: ring }]),
    );

    expect(turned.dropped).toEqual([{ pointId: 'a', reason: 'OUTSIDE_DRAWING' }]);
    expect(level.dropped).toEqual([]);
  });

  it('drops the later of two marks close enough to be one hit area', () => {
    const { set, dropped } = sanitizeMarks(
      served([
        { id: 'a', pieceId: 'KAMEEZ', geometry: span(20, 20, 20, 200) },
        { id: 'b', pieceId: 'KAMEEZ', geometry: span(22, 20, 22, 200) },
      ]),
    );

    expect(dropped).toEqual([{ pointId: 'b', reason: 'TOO_CLOSE' }]);
    expect(set.points.map((point) => point.geometry === null)).toEqual([false, true]);
  });

  it('judges a later mark only against the marks that were kept', () => {
    // c is too close to the dropped b, but far enough from a.
    const { dropped } = sanitizeMarks(
      served([
        { id: 'a', pieceId: 'KAMEEZ', geometry: span(20, 20, 20, 200) },
        { id: 'b', pieceId: 'KAMEEZ', geometry: span(22, 20, 22, 200) },
        { id: 'c', pieceId: 'KAMEEZ', geometry: span(45, 20, 45, 200) },
      ]),
    );

    expect(dropped.map((mark) => mark.pointId)).toEqual(['b']);
  });

  it('lets two points never asked together share a place — a cuff and a plain sleeve', () => {
    const sleeve = {
      id: 'sleeve',
      pieceId: 'KAMEEZ',
      defaultValue: 'CUFF',
      appliesWhen: null,
      values: [
        { id: 'CUFF', drawingVariant: null },
        { id: 'PLAIN', drawingVariant: null },
      ],
    };
    const { dropped } = sanitizeMarks(
      served(
        [
          { id: 'a', pieceId: 'KAMEEZ', geometry: span(20, 20, 20, 200) },
          {
            id: 'b',
            pieceId: 'KAMEEZ',
            geometry: span(80, 20, 80, 200),
            askedWhen: { group: 'sleeve', values: ['CUFF'] },
          },
          {
            id: 'c',
            pieceId: 'KAMEEZ',
            geometry: span(82, 20, 82, 200),
            askedWhen: { group: 'sleeve', values: ['PLAIN'] },
          },
        ],
        [sleeve],
      ),
    );

    expect(dropped).toEqual([]);
  });

  it('never weighs a mark against one on a different garment', () => {
    const { dropped } = sanitizeMarks(
      served([
        { id: 'a', pieceId: 'KAMEEZ', geometry: span(20, 20, 20, 200) },
        { id: 'b', pieceId: 'SHALWAR', geometry: span(20, 20, 20, 200) },
      ]),
    );

    expect(dropped).toEqual([]);
  });

  it('keeps the order, and leaves a point with no mark as it was', () => {
    const input = served([
      { id: 'a', pieceId: 'KAMEEZ', geometry: null },
      { id: 'b', pieceId: 'KAMEEZ', geometry: span(20, 20, 20, 200) },
    ]);
    const { set, dropped } = sanitizeMarks(input);

    expect(dropped).toEqual([]);
    expect(set.points).toEqual(input.points);
  });
});
