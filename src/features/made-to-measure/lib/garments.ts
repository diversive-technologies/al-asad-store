/**
 * §34.6 — the arithmetic every measurement point shares.
 *
 * The customer measures a GARMENT they already own, laid flat, rather than their
 * own body — the path §34.8 made Release 1 scope. A garment on a table does not
 * breathe, slouch or need a second person, and it copies a fit its owner has
 * already confirmed.
 *
 * ## Three facts per point, kept apart
 *
 * `kind` decides only how a point is DRAWN; `enteredAs` decides the ARITHMETIC;
 * `basis` says what the number DESCRIBES. They used to be one fact — the doubling
 * followed the drawn ring — which refused the client's own card figures and could
 * not express a neck, a girth read in full. Pakistani cards write a chest as the
 * half across the garment and a shoulder in full, so how a figure is WRITTEN is
 * data, per point. The record is always the circumference on its declared basis;
 * that is what the workshop cuts.
 *
 * The points themselves are served content (`schemas/measurement-set.schema.ts`);
 * the drawings they land on are `garment-drawings.ts`. Pure: no React, no DOM
 * (PD-02, MOD-04).
 */

import type { Geometry, MeasurementPoint } from '../schemas/measurement-set.schema';

/** A HALF figure is doubled to what gets recorded; a FULL one is recorded as read. */
export function storedFromEntered(point: MeasurementPoint, entered: number): number {
  return point.enteredAs === 'HALF' ? entered * 2 : entered;
}

export function enteredFromStored(point: MeasurementPoint, stored: number): number {
  return point.enteredAs === 'HALF' ? stored / 2 : stored;
}

/**
 * How the figure is read off the tape, which is what the hint and the readout
 * say. It follows the ARITHMETIC, never the drawn shape: a neck is a girth, and
 * telling the customer to double it would record a neck twice its size. A half
 * WIDTH is a card's teera — half the shoulder, doubled to the whole.
 */
export type Reading = 'HALF_GIRTH' | 'HALF_WIDTH' | 'FULL_GIRTH' | 'STRAIGHT';

export function readingOf(point: MeasurementPoint): Reading {
  if (point.enteredAs === 'HALF') return point.kind === 'GIRTH' ? 'HALF_GIRTH' : 'HALF_WIDTH';
  return point.kind === 'GIRTH' ? 'FULL_GIRTH' : 'STRAIGHT';
}

/**
 * Where a marker sits — the ONE rule, so a served list sends a shape and never a
 * second position that could disagree with it.
 *
 * A ring is marked ON the ring, at its outer extremity, not at the centre of the
 * garment — that is where the tape is laid, and a dot in the middle of a chest
 * lands among the placket buttons and is taken for one.
 *
 * A span is marked a third of the way along for the same reason: the midpoint of
 * a shoulder measurement is the centre front, which is the single busiest line on
 * every one of these drawings.
 */
const SPAN_ANCHOR_FRACTION = 0.3;

export function anchorOf(geometry: Geometry): { readonly x: number; readonly y: number } {
  if (geometry.shape === 'RING') {
    const radians = ((geometry.rotate ?? 0) * Math.PI) / 180;
    return {
      x: geometry.cx - geometry.rx * Math.cos(radians),
      y: geometry.cy - geometry.rx * Math.sin(radians),
    };
  }

  return {
    x: geometry.x1 + (geometry.x2 - geometry.x1) * SPAN_ANCHOR_FRACTION,
    y: geometry.y1 + (geometry.y2 - geometry.y1) * SPAN_ANCHOR_FRACTION,
  };
}
