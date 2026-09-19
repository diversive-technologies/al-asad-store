import type { CSSProperties } from 'react';

import { detailOf, DRAWINGS, type DrawingId } from '../lib/garment-drawings';

export interface GarmentMarkProps {
  readonly garment: DrawingId;
}

/**
 * One garment flat, off the studio — the drawing as a picture rather than as an
 * instrument.
 *
 * The studio's own `GarmentFlat` carries every mark, a hotspot button over
 * each and a live active state. This carries ONE ring and nothing interactive,
 * because here the drawing is making a single statement: this store draws your
 * clothes flat and measures them.
 *
 * The ring is the drawing's own emblem, not a measurement borrowed from the
 * served list: the homepage makes no backend read for it, and it cannot move
 * because a tailor reordered a form.
 *
 * Decorative (A11Y-04) — every consumer states in words what the drawing shows,
 * so it is `aria-hidden` and takes no name.
 *
 * A Server Component: the drawings are static data and nothing here holds state,
 * so the homepage ships no extra JavaScript for it.
 */
export function GarmentMark({ garment }: GarmentMarkProps) {
  const drawing = DRAWINGS[garment];
  const ring = drawing.emblem;

  return (
    <svg
      viewBox={`0 0 ${String(drawing.width)} ${String(drawing.height)}`}
      className="garment-mark"
      /* STY-01a — the ratio is the drawing's own viewBox, as `.gf-stage`'s
         `--gf-ratio` is; the `as` is TS-03(4), a custom property on `style`. */
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
        {detailOf(drawing).map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      <ellipse className="gf-mark" cx={ring.cx} cy={ring.cy} rx={ring.rx} ry={ring.ry} />
    </svg>
  );
}
