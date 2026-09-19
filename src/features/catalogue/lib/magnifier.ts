/**
 * MOD-04 — pure. Where §28.2's desktop magnifier points.
 *
 * The magnifier scales the photograph in place about an ORIGIN, and a scale
 * about a point leaves that point where it was: putting the origin under the
 * pointer is what makes the part of the garment under the cursor the part that
 * is enlarged, wherever in the frame the cursor is.
 *
 * The result is a percentage of the frame, measured from its PHYSICAL left and
 * top edges, because that is what `transform-origin` percentages mean. It is
 * deliberately not mirrored under RTL (the I18N-04 exception): a pointer
 * position is a physical fact about the screen, and the zoom has to follow the
 * hand, not the reading direction.
 */

export interface MagnifierPoint {
  readonly clientX: number;
  readonly clientY: number;
}

/** The frame's box on screen, as `getBoundingClientRect` reports it. */
export interface MagnifierBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface MagnifierOrigin {
  /** 0 at the frame's left edge, 100 at its right. */
  readonly x: number;
  /** 0 at the frame's top edge, 100 at its bottom. */
  readonly y: number;
}

/** The centre, for a frame with no size to measure against. */
const CENTRE = 50;

/** One decimal place of a percent is finer than a pixel on any frame this size. */
function toPercent(offset: number, length: number): number {
  if (length <= 0) return CENTRE;
  const clamped = Math.min(Math.max(offset / length, 0), 1);
  return Math.round(clamped * 1000) / 10;
}

/**
 * The origin for a pointer over the frame, clamped to the frame.
 *
 * Clamped because a pointer event can report a position a fraction outside the
 * box it was dispatched to (subpixel borders, a frame mid-scroll), and an origin
 * past the edge would slide blank space into view.
 */
export function magnifierOrigin(point: MagnifierPoint, box: MagnifierBox): MagnifierOrigin {
  return {
    x: toPercent(point.clientX - box.left, box.width),
    y: toPercent(point.clientY - box.top, box.height),
  };
}
