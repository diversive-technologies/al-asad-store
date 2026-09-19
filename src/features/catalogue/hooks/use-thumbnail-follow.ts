'use client';

import { useEffect, type RefObject } from 'react';

import { stripScrollDelta } from '../lib/thumbnail-strip';

/**
 * Keeps a thumbnail strip's current thumbnail in view, scrolling the STRIP and
 * nothing else.
 *
 * STATE-04 — the external system is the strip's own scroll position, which lives
 * in the DOM. The frame can change where the strip is not being looked at — in
 * the full-screen view, over the page's strip — and on a phone the page's strip
 * then reopened on a thumbnail scrolled out of sight. `scrollIntoView` would do
 * it in one call, but it scrolls every scrolling ancestor, the window included,
 * so the page would move under the customer; this moves the strip alone, by the
 * physical distance `stripScrollDelta` measures, in either reading direction.
 *
 * `isShown` false skips it while the strip cannot be seen: a hidden strip
 * measures nothing. It measures a frame later for the same reason — a strip
 * inside a dialog is opened by the dialog's own effect, which, being an
 * ancestor's, runs after this one. The strip's own `scroll-behavior` decides
 * whether the scroll is smooth, so a reduced-motion preference holds (A11Y-10).
 */
export function useThumbnailFollow(
  strip: RefObject<HTMLElement | null>,
  activeIndex: number,
  isShown: boolean,
): void {
  useEffect(() => {
    if (!isShown) return;

    const frame = requestAnimationFrame(() => {
      const element = strip.current;
      const current = element?.querySelector('[aria-current="true"]') ?? null;
      if (element === null || current === null) return;

      const delta = stripScrollDelta(
        element.getBoundingClientRect(),
        current.getBoundingClientRect(),
      );
      if (delta !== 0) element.scrollBy({ left: delta });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [strip, activeIndex, isShown]);
}
