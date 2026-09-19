'use client';

import type { CSSProperties } from 'react';

import type { MeasurementPointId } from '@/lib/domain/ids';
import { cn } from '@/lib/utils/cn';

import { detailOf, type GarmentDrawing } from '../lib/garment-drawings';
import type { StudioPoint } from '../lib/studio-set';
import type { Geometry } from '../schemas/measurement-set.schema';
import { GarmentHotspots, type Marked } from './GarmentHotspots';

export interface GarmentFlatProps {
  readonly drawing: GarmentDrawing;
  /** The drawing variants the garment's finishing choices name — see `detailOf`. */
  readonly variants: ReadonlySet<string>;
  /** The points taken on this garment, as served — words and all. */
  readonly points: readonly StudioPoint[];
  readonly activeId: MeasurementPointId | null;
  /** Ids that already hold a plausible figure, so the drawing shows progress. */
  readonly filledIds: ReadonlySet<MeasurementPointId>;
  /** Null draws the marks without their buttons — nothing on screen to send them to. */
  readonly onSelect: ((id: MeasurementPointId) => void) | null;
}

function isMarked(point: StudioPoint): point is Marked {
  return point.geometry !== null;
}

/** Arrowheads at both ends, so a span reads as a dimension rather than a seam. */
function spanPath(geometry: Extract<Geometry, { shape: 'SPAN' }>): string {
  const { x1, y1, x2, y2 } = geometry;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 5;
  const spread = 0.42;

  const wing = (x: number, y: number, direction: number): string =>
    [
      `M ${String(x)} ${String(y)}`,
      `L ${String(x + Math.cos(direction + spread) * head)} ${String(y + Math.sin(direction + spread) * head)}`,
      `M ${String(x)} ${String(y)}`,
      `L ${String(x + Math.cos(direction - spread) * head)} ${String(y + Math.sin(direction - spread) * head)}`,
    ].join(' ');

  return [
    `M ${String(x1)} ${String(y1)} L ${String(x2)} ${String(y2)}`,
    wing(x1, y1, angle),
    wing(x2, y2, angle + Math.PI),
  ].join(' ');
}

interface AnnotationMarkProps {
  readonly point: Marked;
  readonly state: 'idle' | 'filled' | 'active';
}

function AnnotationMark({ point, state }: AnnotationMarkProps) {
  const className = cn(
    'gf-mark',
    state === 'active' && 'gf-mark--active',
    state === 'filled' && 'gf-mark--filled',
  );

  if (point.geometry.shape === 'RING') {
    const { cx, cy, rx, ry, rotate } = point.geometry;
    return (
      <ellipse
        className={className}
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        /* A cuff is not horizontal, so nor is the ring that wraps it. */
        transform={
          rotate === undefined ? undefined : `rotate(${String(rotate)} ${String(cx)} ${String(cy)})`
        }
      />
    );
  }

  return <path className={className} d={spanPath(point.geometry)} />;
}

/**
 * One garment, drawn flat, with its measurements marked on it.
 *
 * The shape of a mark says what KIND of measurement it is: an ellipse goes
 * around the garment, an arrow runs along it. That is the distinction §34.6 calls
 * load-bearing, and on a flat drawing it is the only thing separating a chest
 * from a shoulder — both of which are a horizontal line across the same garment.
 * Whether the figure is then doubled is a separate fact, and the caption says it.
 */
export function GarmentFlat({
  drawing,
  variants,
  points,
  activeId,
  filledIds,
  onSelect,
}: GarmentFlatProps) {
  const marked = points.filter(isMarked);

  return (
    <div
      className="gf-stage"
      /* STY-01a — the ratio is the drawing's own viewBox, data, so it travels as a
         custom property; the `as` is TS-03(4), a custom property on `style`. */
      style={
        { '--gf-ratio': `${String(drawing.width)} / ${String(drawing.height)}` } as CSSProperties
      }
    >
      <svg
        viewBox={`0 0 ${String(drawing.width)} ${String(drawing.height)}`}
        className="absolute inset-0 size-full"
        /* A11Y-04: the drawing repeats what the fields already say, so it is
           decorative to assistive technology. The markers over it are not. */
        aria-hidden="true"
        focusable="false"
      >
        <g className="gf-outline">
          {drawing.outline.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        <g className="gf-detail">
          {detailOf(drawing, variants).map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        {marked.map((point) => (
          <AnnotationMark
            key={point.id}
            point={point}
            state={point.id === activeId ? 'active' : filledIds.has(point.id) ? 'filled' : 'idle'}
          />
        ))}
      </svg>

      <GarmentHotspots
        drawing={drawing}
        marked={marked}
        activeId={activeId}
        filledIds={filledIds}
        onSelect={onSelect}
      />
    </div>
  );
}
