'use client';

import { useEffect, useRef, type RefObject } from 'react';

import { focusTargetFor, type TryOnFace, type TryOnFocusTarget } from '../lib/try-on-face';

/** The elements focus can be handed to, owned by the panel and handed in. */
export type TryOnFocusElements = Readonly<Record<TryOnFocusTarget, RefObject<HTMLElement | null>>>;

/**
 * A11Y-08 — focus follows the panel from face to face (`focusTargetFor`).
 *
 * STATE-04 — the external system is DOM focus. Only a CHANGE of face moves it:
 * the dialog places focus when it opens, and the picker's first draw must not
 * take it away. The target is focused after the new face has committed, so the
 * element it names exists.
 */
export function useTryOnFocus(
  face: TryOnFace['kind'],
  hasPhoto: boolean,
  elements: TryOnFocusElements,
): void {
  const shown = useRef(face);

  useEffect(() => {
    if (shown.current === face) return;
    shown.current = face;
    elements[focusTargetFor(face, hasPhoto)].current?.focus();
  }, [face, hasPhoto, elements]);
}
