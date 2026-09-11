'use client';

import { useSyncExternalStore } from 'react';

/*
 * The part of the page the reader can actually SEE, in CSS pixels: how tall it
 * is, and how far it has been panned down the layout.
 *
 * An on-screen keyboard covers the page without shrinking `100dvh` — iOS Safari
 * has never resized the layout viewport for it, and Chrome on Android stopped in
 * version 108 — and iOS then PANS the visible area down the layout to reveal the
 * caret, which carries anything `position: fixed` off the top of the screen.
 * `visualViewport` is the one measure that follows both, so whatever must stay
 * in view with a keyboard up is placed from it.
 *
 * `null` while the reader has pinch-zoomed: fitting something to the visible area
 * then would shrink the very thing being zoomed, so the page keeps its ordinary
 * layout. Also `null` on the server, which has no viewport.
 *
 * STATE-04, as `use-media-query` and `use-scrolled-past`. Two hooks rather than
 * one object, because a snapshot has to compare equal when nothing changed.
 */
function subscribe(onChange: () => void): () => void {
  const viewport = window.visualViewport;
  viewport?.addEventListener('resize', onChange);
  viewport?.addEventListener('scroll', onChange);
  return () => {
    viewport?.removeEventListener('resize', onChange);
    viewport?.removeEventListener('scroll', onChange);
  };
}

function unzoomed(): VisualViewport | null {
  const viewport = window.visualViewport;
  return viewport === null || Math.abs(viewport.scale - 1) > 0.01 ? null : viewport;
}

function heightSnapshot(): number | null {
  const viewport = unzoomed();
  return viewport === null ? null : Math.round(viewport.height);
}

function topSnapshot(): number | null {
  const viewport = unzoomed();
  return viewport === null ? null : Math.round(viewport.offsetTop);
}

/** How tall the visible part of the page is. */
export function useVisibleHeight(): number | null {
  return useSyncExternalStore(subscribe, heightSnapshot, () => null);
}

/** How far the visible part has been panned down the layout. */
export function useVisibleTop(): number | null {
  return useSyncExternalStore(subscribe, topSnapshot, () => null);
}
