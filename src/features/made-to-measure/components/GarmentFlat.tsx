'use client';

import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils/cn';

import { DRAWINGS } from '../lib/garment-drawings';
import {
  anchorOf,
  measurementsFor,
  type Annotation,
  type GarmentId,
  type Measurement,
  type MeasurementId,
} from '../lib/garments';

export interface GarmentFlatProps {
  readonly garment: GarmentId;
  readonly activeId: MeasurementId | null;
  /** Ids that already hold a plausible figure, so the drawing shows progress. */
  readonly filledIds: ReadonlySet<MeasurementId>;
  /**
   * Resolved copy, keyed by measurement id (I18N-01 — never a literal in here).
   *
   * The registry object is passed straight through rather than mapped to a
   * `Record<id, string>` first: `Object.fromEntries` widens the key back to
   * `string`, and recovering the union would take an assertion to buy nothing.
   */
  readonly labels: Readonly<Record<MeasurementId, { readonly label: string }>>;
  readonly onSelect: (id: MeasurementId) => void;
}

/** Arrowheads at both ends, so a span reads as a dimension rather than a seam. */
function spanPath(annotation: Extract<Annotation, { shape: 'SPAN' }>): string {
  const { x1, y1, x2, y2 } = annotation;
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

function AnnotationMark({
  measurement,
  state,
}: {
  measurement: Measurement;
  state: 'idle' | 'filled' | 'active';
}) {
  const className = cn(
    'gf-mark',
    state === 'active' && 'gf-mark--active',
    state === 'filled' && 'gf-mark--filled',
  );

  if (measurement.annotation.shape === 'RING') {
    const { cx, cy, rx, ry, rotate } = measurement.annotation;
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

  return <path className={className} d={spanPath(measurement.annotation)} />;
}

/**
 * One garment, drawn flat, with its measurements marked on it.
 *
 * The shape of a mark carries its arithmetic: an ellipse goes AROUND and is
 * doubled, an arrow is read straight off the tape. That is the distinction §34.6
 * calls load-bearing, and on a flat drawing it is the only thing separating a
 * chest from a shoulder — both of which are a horizontal line across the same
 * garment.
 */
export function GarmentFlat({ garment, activeId, filledIds, labels, onSelect }: GarmentFlatProps) {
  const drawing = DRAWINGS[garment];
  const measurements = measurementsFor(garment);
  const active = measurements.find((measurement) => measurement.id === activeId) ?? null;

  return (
    <div
      className="gf-stage"
      /* STY-01a — the ratio comes from the drawing's own viewBox, which is data,
         so it travels as a custom property rather than as a style declaration. */
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
          {drawing.detail.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        {measurements.map((measurement) => (
          <AnnotationMark
            key={measurement.id}
            measurement={measurement}
            state={
              measurement.id === activeId
                ? 'active'
                : filledIds.has(measurement.id)
                  ? 'filled'
                  : 'idle'
            }
          />
        ))}
      </svg>

      {/* Real buttons over the drawing rather than shapes inside it — A11Y-01
          prohibits a clickable non-button, and A11Y-11 prefers native semantics
          to `role="button"` on an SVG path. */}
      <div className="absolute inset-0">
        {measurements.map((measurement) => {
          const anchor = anchorOf(measurement);
          return (
            <button
              key={measurement.id}
              type="button"
              onClick={() => {
                onSelect(measurement.id);
              }}
              className="gf-hotspot"
              /* STY-01a — a per-measurement coordinate, unbounded and not
                 enumerable as a utility. I18N-04 does not apply: the drawing is
                 an image of a garment and does not mirror, so these resolve to
                 physical `left`/`top` in the stylesheet on purpose. */
              style={
                {
                  '--gf-x': `${String((anchor.x / drawing.width) * 100)}%`,
                  '--gf-y': `${String((anchor.y / drawing.height) * 100)}%`,
                } as CSSProperties
              }
            >
              <span
                aria-hidden="true"
                className={cn(
                  'gf-dot',
                  measurement.id === activeId && 'gf-dot--active',
                  measurement.id !== activeId && filledIds.has(measurement.id) && 'gf-dot--filled',
                )}
              />
              <span className="sr-only">{labels[measurement.id].label}</span>
            </button>
          );
        })}

        {active === null ? null : (
          <span
            aria-hidden="true"
            className="gf-tag"
            style={
              {
                '--gf-x': `${String((anchorOf(active).x / drawing.width) * 100)}%`,
                '--gf-y': `${String((anchorOf(active).y / drawing.height) * 100)}%`,
              } as CSSProperties
            }
          >
            {labels[active.id].label}
          </span>
        )}
      </div>
    </div>
  );
}
