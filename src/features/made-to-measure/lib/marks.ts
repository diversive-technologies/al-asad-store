/**
 * The marks a served list is allowed to draw.
 *
 * The shapes arrive in the coordinates of a drawing the FRONTEND owns, so nothing
 * on the backend can see a mark land off its garment or on top of another. Two
 * failures were real here once already — a mark among the placket buttons taken
 * for one, and two hit areas overlapping so a tap opened the wrong field — and a
 * test over a fixture cannot guard rows that come from somewhere else.
 *
 * A shape outside its drawing, or a mark closer than 24 units to an earlier one
 * on the same piece that can be asked WITH it, is DROPPED: the point is drawn with
 * no mark and reported. Two points never asked together — a cuff and a plain
 * sleeve's opening — may share a place, because only one is ever on the drawing.
 * The figure is an enhancement (§34.6) — the field and its instruction still work
 * — so this degrades the picture rather than refusing the page.
 *
 * MOD-04 — pure.
 */

import type { MeasurementPieceId, MeasurementPointId } from '@/lib/domain/ids';

import type {
  Geometry,
  MeasurementPoint,
  MeasurementSet,
} from '../schemas/measurement-set.schema';
import { DRAWINGS, type GarmentDrawing } from './garment-drawings';
import { anchorOf } from './garments';
import { neverTogether } from './options';

/**
 * Each mark carries a 2.25rem button, and twenty-four drawing units is roughly a
 * dot plus its air at the smallest size these drawings render at.
 */
export const MINIMUM_MARK_SEPARATION = 24;

export interface DroppedMark {
  readonly pointId: MeasurementPointId;
  readonly reason: 'OUTSIDE_DRAWING' | 'TOO_CLOSE';
}

/*
 * The extent of a shape as DRAWN. A ring is measured rotated, where it is — which
 * is also where its anchor lands. The unrotated box let a turned ring through with
 * its mark, and the button over it, off the drawing.
 */
function extent(geometry: Geometry): readonly [number, number, number, number] {
  if (geometry.shape === 'SPAN') {
    return [
      Math.min(geometry.x1, geometry.x2),
      Math.max(geometry.x1, geometry.x2),
      Math.min(geometry.y1, geometry.y2),
      Math.max(geometry.y1, geometry.y2),
    ];
  }

  const radians = ((geometry.rotate ?? 0) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const halfWidth = Math.hypot(geometry.rx * cos, geometry.ry * sin);
  const halfHeight = Math.hypot(geometry.rx * sin, geometry.ry * cos);
  return [
    geometry.cx - halfWidth,
    geometry.cx + halfWidth,
    geometry.cy - halfHeight,
    geometry.cy + halfHeight,
  ];
}

function insideDrawing(geometry: Geometry, drawing: GarmentDrawing): boolean {
  const [minX, maxX, minY, maxY] = extent(geometry);
  return minX >= 0 && maxX <= drawing.width && minY >= 0 && maxY <= drawing.height;
}

export function sanitizeMarks(set: MeasurementSet): {
  readonly set: MeasurementSet;
  readonly dropped: readonly DroppedMark[];
} {
  const dropped: DroppedMark[] = [];
  const placed = new Map<
    MeasurementPieceId,
    { readonly x: number; readonly y: number; readonly point: MeasurementPoint }[]
  >();

  // In list order, so of two crowded marks it is always the later one that goes.
  const check = (point: MeasurementPoint): MeasurementPoint => {
    const piece = set.pieces.find((candidate) => candidate.id === point.pieceId);
    if (point.geometry === null || piece === undefined) return point;

    if (!insideDrawing(point.geometry, DRAWINGS[piece.drawingId])) {
      dropped.push({ pointId: point.id, reason: 'OUTSIDE_DRAWING' });
      return { ...point, geometry: null };
    }

    const anchor = anchorOf(point.geometry);
    const others = placed.get(point.pieceId) ?? [];
    const crowded = others.some(
      (other) =>
        !neverTogether(other.point, point, set.options) &&
        Math.hypot(other.x - anchor.x, other.y - anchor.y) < MINIMUM_MARK_SEPARATION,
    );
    if (crowded) {
      dropped.push({ pointId: point.id, reason: 'TOO_CLOSE' });
      return { ...point, geometry: null };
    }

    placed.set(point.pieceId, [...others, { ...anchor, point }]);
    return point;
  };

  const [first, ...rest] = set.points;
  const points: MeasurementSet['points'] = [check(first), ...rest.map(check)];
  return { set: { ...set, points }, dropped };
}
