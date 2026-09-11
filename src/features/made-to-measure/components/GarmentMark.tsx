import type { CSSProperties } from 'react';

import { DRAWINGS } from '../lib/garment-drawings';
import { measurementsFor, type GarmentId } from '../lib/garments';

export interface GarmentMarkProps {
  readonly garment: GarmentId;
}

/**
 * One garment flat, off the studio — the drawing as a picture rather than as an
 * instrument.
 *
 * The studio's own `GarmentFlat` carries thirteen marks, a hotspot button over
 * each and a live active state. This carries ONE ring and nothing interactive,
 * because here the drawing is making a single statement: this store draws your
 * clothes flat and measures them.
 *
 * Decorative (A11Y-04) — every consumer states in words what the drawing shows,
 * so it is `aria-hidden` and takes no name.
 *
 * A Server Component: the drawings are static data and nothing here holds state,
 * so the homepage ships no extra JavaScript for it.
 */
export function GarmentMark({ garment }: GarmentMarkProps) {
  const drawing = DRAWINGS[garment];
  /*
   * The first RING on the garment — a chest, a waist. A SPAN would be an arrow
   * pointing at an edge, which needs its label to mean anything; a ring reads as
   * "measured here" on its own.
   */
  const ring = measurementsFor(garment).find(
    (measurement) => measurement.annotation.shape === 'RING',
  )?.annotation;

  return (
    <svg
      viewBox={`0 0 ${String(drawing.width)} ${String(drawing.height)}`}
      className="garment-mark"
      /* STY-01a — the ratio is the drawing's own viewBox, which is data, exactly
         as `.gf-stage`'s `--gf-ratio` is. */
      style={
        {
          '--gm-ratio': `${String(drawing.width)} / ${String(drawing.height)}`,
        } as CSSProperties
      }
      aria-hidden
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

      {ring === undefined || ring.shape !== 'RING' ? null : (
        <ellipse
          className="gf-mark"
          cx={ring.cx}
          cy={ring.cy}
          rx={ring.rx}
          ry={ring.ry}
          transform={
            ring.rotate === undefined
              ? undefined
              : `rotate(${String(ring.rotate)} ${String(ring.cx)} ${String(ring.cy)})`
          }
        />
      )}
    </svg>
  );
}
