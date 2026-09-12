import type { CSSProperties } from 'react';

import type { MeasurementPointId } from '@/lib/domain/ids';
import { cn } from '@/lib/utils/cn';

import type { GarmentDrawing } from '../lib/garment-drawings';
import { anchorOf } from '../lib/garments';
import type { StudioPoint } from '../lib/studio-set';
import type { Geometry } from '../schemas/measurement-set.schema';

/** A point the drawing can show. The rest are completed from their field alone. */
export type Marked = StudioPoint & { readonly geometry: Geometry };

export interface GarmentHotspotsProps {
  readonly drawing: GarmentDrawing;
  readonly marked: readonly Marked[];
  readonly activeId: MeasurementPointId | null;
  readonly filledIds: ReadonlySet<MeasurementPointId>;
  /** Null draws no buttons — nothing on screen to send them to. */
  readonly onSelect: ((id: MeasurementPointId) => void) | null;
}

/* STY-01a — a per-point coordinate, unbounded and not enumerable as a utility.
   I18N-04 does not apply: the drawing is an image of a garment and does not
   mirror, so these resolve to physical `left`/`top` in the stylesheet on purpose. */
function placeAt(drawing: GarmentDrawing, geometry: Geometry): CSSProperties {
  const anchor = anchorOf(geometry);
  return {
    '--gf-x': `${String((anchor.x / drawing.width) * 100)}%`,
    '--gf-y': `${String((anchor.y / drawing.height) * 100)}%`,
  } as CSSProperties;
}

/**
 * The marks as real buttons over the drawing rather than shapes inside it —
 * A11Y-01 prohibits a clickable non-button, and A11Y-11 prefers native semantics
 * to `role="button"` on an SVG path — and the name tag over the one in hand.
 */
export function GarmentHotspots({
  drawing,
  marked,
  activeId,
  filledIds,
  onSelect,
}: GarmentHotspotsProps) {
  const active = marked.find((point) => point.id === activeId) ?? null;

  return (
    <div className="absolute inset-0">
      {onSelect === null
        ? null
        : marked.map((point) => (
            <button
              key={point.id}
              type="button"
              onClick={() => {
                onSelect(point.id);
              }}
              className="gf-hotspot"
              style={placeAt(drawing, point.geometry)}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'gf-dot',
                  point.id === activeId && 'gf-dot--active',
                  point.id !== activeId && filledIds.has(point.id) && 'gf-dot--filled',
                )}
              />
              <span className="sr-only">{point.label}</span>
            </button>
          ))}

      {active === null ? null : (
        <span aria-hidden="true" className="gf-tag" style={placeAt(drawing, active.geometry)}>
          {active.label}
        </span>
      )}
    </div>
  );
}
