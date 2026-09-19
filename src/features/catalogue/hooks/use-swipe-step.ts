'use client';

import { useRef, type MouseEvent, type TouchEvent } from 'react';

import { swipeStep } from '../lib/frame-navigation';

export interface SwipeStepHandlers {
  readonly onTouchStart: (event: TouchEvent<HTMLElement>) => void;
  readonly onTouchEnd: (event: TouchEvent<HTMLElement>) => void;
  readonly onClickCapture: (event: MouseEvent<HTMLElement>) => void;
}

interface GestureStart {
  readonly x: number;
  readonly y: number;
  /** The most fingers down at once so far — a second finger makes it a pinch. */
  readonly fingers: number;
}

/**
 * The swipe that steps through a product's frames: on a catalogue card, and in
 * the product page's full-screen view. What counts as a swipe is decided once,
 * in `swipeStep`, so the two surfaces cannot disagree about it (PD-01).
 *
 * Touch is where this matters: a card's arrows are revealed by hover, and a
 * phone has none, so on a small screen a swipe is the ONLY way to reach the
 * other frames. It is also the gesture people already have for photographs.
 *
 * Deliberately no `touchmove` handler and nothing prevented: the page must still
 * scroll under the finger, and pinch-zoom must still work (§30.3) — the browser
 * only does either if it is left alone. The gesture is judged once, when the
 * LAST finger lifts, so a pinch is remembered as two fingers rather than read as
 * two separate one-finger drags. Direction and zoom are read from the document
 * at that moment rather than from props, so there is nothing to get out of step
 * and no hydration-time guess about either.
 *
 * A completed swipe sets a latch that the click the browser fires afterwards
 * spends, captured on the way DOWN. Without it a swipe would ALSO activate
 * whatever it ended on — a card's link, or an arrow in the full-screen view —
 * because a drag that ends on an element still produces a click in some browsers.
 *
 * `onStep` receives +1 for forwards and -1 for backwards.
 */
export function useSwipeStep(
  isEnabled: boolean,
  onStep: (delta: number) => void,
): SwipeStepHandlers {
  const gestureStart = useRef<GestureStart | null>(null);
  const didSwipe = useRef(false);

  return {
    onTouchStart: (event) => {
      const touch = event.touches[0];
      if (touch === undefined) return;

      const current = gestureStart.current;
      if (current !== null && event.touches.length > 1) {
        gestureStart.current = {
          ...current,
          fingers: Math.max(current.fingers, event.touches.length),
        };
        return;
      }

      gestureStart.current = { x: touch.clientX, y: touch.clientY, fingers: event.touches.length };
      didSwipe.current = false;
    },
    onTouchEnd: (event) => {
      // Another finger is still down: the gesture is not over yet.
      if (event.touches.length > 0) return;

      const start = gestureStart.current;
      gestureStart.current = null;

      const touch = event.changedTouches[0];
      if (start === null || touch === undefined || !isEnabled) return;

      const view = event.currentTarget.ownerDocument;
      const step = swipeStep({
        dx: touch.clientX - start.x,
        dy: touch.clientY - start.y,
        isRtl: view.documentElement.dir === 'rtl',
        fingers: start.fingers,
        viewportScale: view.defaultView?.visualViewport?.scale ?? 1,
      });
      if (step === null) return;

      didSwipe.current = true;
      onStep(step);
    },
    onClickCapture: (event) => {
      if (!didSwipe.current) return;

      event.preventDefault();
      event.stopPropagation();
      didSwipe.current = false;
    },
  };
}
