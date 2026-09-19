/**
 * MOD-04 — pure. How a customer moves between a product's frames: on a card, in
 * the product page's gallery and in its full-screen view. Kept apart from the
 * listeners that observe the gestures so each rule can be tested without a
 * document, and so the card and the gallery judge a swipe the SAME way (PD-01).
 */

/**
 * How far a finger must travel across a frame before it counts as a swipe.
 *
 * 40px, which is far enough that a tap with a little wobble in it still counts
 * as a tap — on a card the whole image is a link, so every accidental swipe is a
 * navigation the customer did not ask for, and every missed one is a frame they
 * did not get. The threshold is the only thing separating the two.
 */
export const SWIPE_MIN_PX = 40;

/** A finished touch gesture, measured from where it started to where it ended. */
export interface SwipeGesture {
  readonly dx: number;
  readonly dy: number;
  readonly isRtl: boolean;
  /** The most fingers that were down at once during the gesture. */
  readonly fingers: number;
  /** `visualViewport.scale` when the gesture ended; 1 when the page is not zoomed. */
  readonly viewportScale: number;
}

/** A pinch leaves the scale a hair off 1 without meaning to zoom. */
const ZOOM_TOLERANCE = 0.01;

/**
 * Wraps a frame position into `0 … count - 1`, from either direction.
 *
 * Wrapping rather than stopping at the ends, everywhere frames are stepped: a
 * control that disables at the last frame drops the focus of the keyboard user
 * who just pressed it, and a customer who reaches the end wants the start.
 */
export function wrapIndex(index: number, count: number): number {
  if (count < 1) return 0;
  return ((index % count) + count) % count;
}

/**
 * The step a finished swipe asks for: +1 forwards, -1 backwards, or `null` when
 * the gesture was not a swipe at all.
 *
 * Not a swipe:
 * - too short, or mostly vertical — the reader is scrolling the page;
 * - made with more than one finger — that is a PINCH, and §30.3 says pinch-zoom
 *   is never taken away, so it must not also turn the frame;
 * - made while the page is zoomed in — a customer who pinched into a photograph
 *   is PANNING across it, and changing the picture under them would throw away
 *   the zoom they just made.
 *
 * I18N-05 — the gesture mirrors under RTL. Dragging content towards the reading
 * end means "forwards" in both directions, which is what every native photo
 * viewer does.
 */
export function swipeStep(gesture: SwipeGesture): 1 | -1 | null {
  if (gesture.fingers > 1) return null;
  if (Math.abs(gesture.viewportScale - 1) > ZOOM_TOLERANCE) return null;
  if (Math.abs(gesture.dx) < SWIPE_MIN_PX) return null;
  if (Math.abs(gesture.dx) <= Math.abs(gesture.dy)) return null;

  const isForwards = gesture.isRtl ? gesture.dx > 0 : gesture.dx < 0;
  return isForwards ? 1 : -1;
}

/** A key pressed inside the full-screen view. */
export interface FrameKeyPress {
  readonly key: string;
  readonly isRtl: boolean;
  /** Alt, Control or Meta held — the browser's own shortcuts (Alt+← is Back). */
  readonly hasModifier: boolean;
  readonly index: number;
  readonly count: number;
}

/**
 * The frame a key press moves to, or `null` when the key is not ours to handle.
 *
 * The arrow keys step and Home and End jump to either end. The arrows follow the
 * READING direction rather than the keyboard's: under RTL the frame after this
 * one lies to the left, so ← is forwards (I18N-05).
 */
export function frameForKey(press: FrameKeyPress): number | null {
  if (press.hasModifier || press.count < 2) return null;

  const forwards = press.isRtl ? 'ArrowLeft' : 'ArrowRight';
  const backwards = press.isRtl ? 'ArrowRight' : 'ArrowLeft';

  switch (press.key) {
    case forwards:
      return wrapIndex(press.index + 1, press.count);
    case backwards:
      return wrapIndex(press.index - 1, press.count);
    case 'Home':
      return 0;
    case 'End':
      return press.count - 1;
    default:
      return null;
  }
}
