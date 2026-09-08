'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * The native `<dialog>` open/close lifecycle, shared by every modal in the app.
 *
 * PD-01: this logic was written once for `SlideOver` and is subtle enough that a
 * second copy inside `Dialog` would be a defect rather than a convenience. What
 * it hides is the one non-obvious thing about closing a `<dialog>`:
 *
 * `close()` removes the element from the top layer IMMEDIATELY, so a panel that
 * simply closed would vanish rather than leave. The `data-closing` attribute
 * drives the outgoing transition and the element is closed only once that
 * transition has had time to play — which is why the caller's CSS duration and
 * `exitMs` have to agree.
 *
 * STATE-04: the external system here is the dialog element's own open/closed
 * state, which lives in the DOM rather than in React. `showModal()` is not
 * something JSX can express, so this effect is the synchronisation point.
 */
export function useNativeDialog(
  isOpen: boolean,
  exitMs: number,
): RefObject<HTMLDialogElement | null> {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    if (isOpen) {
      if (closingTimer.current !== null) clearTimeout(closingTimer.current);
      dialog.removeAttribute('data-closing');
      if (!dialog.open) dialog.showModal();
      return;
    }

    if (!dialog.open) return;

    dialog.setAttribute('data-closing', 'true');
    closingTimer.current = setTimeout(() => {
      dialog.removeAttribute('data-closing');
      dialog.close();
    }, exitMs);
  }, [isOpen, exitMs]);

  useEffect(
    () => () => {
      if (closingTimer.current !== null) clearTimeout(closingTimer.current);
    },
    [],
  );

  return dialogRef;
}
