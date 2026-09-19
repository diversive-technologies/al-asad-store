'use client';

import { useEffect, useState } from 'react';

import { wrapIndex } from '../lib/frame-navigation';

/**
 * How long each frame holds before the hover advances to the next one.
 *
 * 2.5s, not 1.1s. With five frames the faster cadence cycled a whole garment in
 * under six seconds, which read as a flicker rather than a look — the eye never
 * settled on one image long enough to take it in.
 */
const ADVANCE_MS = 2500;

export interface FrameCarousel {
  readonly index: number;
  /** Moves by `delta` frames, wrapping, and pins the frame for the rest of the hover. */
  readonly step: (delta: number) => void;
}

/**
 * A product card's frame position: advanced by the clock while the card is
 * active, stepped by the arrows and the swipe, and returned to the first frame
 * when the card is left.
 */
export function useFrameCarousel(count: number, isActive: boolean): FrameCarousel {
  const [index, setIndex] = useState(0);
  /*
   * Set the moment an arrow is used, and it stops the automatic advance for the
   * rest of this hover. Someone who steers to a frame is looking at THAT frame;
   * sliding it out from under them a second later is the interface arguing with
   * them. Leaving the card clears it, so the next hover plays again.
   */
  const [isPinned, setIsPinned] = useState(false);

  /*
   * STATE-04 — the external system is the CLOCK. An interval is the only way to
   * advance a slideshow, and it is torn down the moment the pointer leaves so a
   * grid of 24 cards never has 24 timers running at once.
   */
  useEffect(() => {
    if (!isActive || count < 2 || isPinned) return;

    const timer = setInterval(() => {
      setIndex((current) => wrapIndex(current + 1, count));
    }, ADVANCE_MS);

    return () => {
      clearInterval(timer);
    };
  }, [isActive, isPinned, count]);

  /*
   * Leaving the card returns it to the frame the operator put first.
   *
   * Adjusted DURING render rather than in an effect: this is derived from a prop
   * changing, not a synchronisation with anything outside React, and
   * `set-state-in-effect` is right to refuse it. React re-renders immediately
   * with the corrected value and nothing in between is painted.
   */
  const [wasActive, setWasActive] = useState(isActive);

  if (isActive !== wasActive) {
    setWasActive(isActive);

    if (!isActive) {
      setIndex(0);
      setIsPinned(false);
    }
  }

  return {
    index,
    step: (delta) => {
      setIsPinned(true);
      setIndex((current) => wrapIndex(current + delta, count));
    },
  };
}
