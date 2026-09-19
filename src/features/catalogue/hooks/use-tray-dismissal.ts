'use client';

import { useEffect, type RefObject } from 'react';

import { trayDismissalFor } from '../lib/tray-dismissal';

/**
 * Closes an open quick-add tray on Escape — returning focus to its toggle — and
 * on a press anywhere outside the card's action area (`trayDismissalFor`).
 *
 * STATE-04 — the external system is the DOCUMENT's keyboard and pointer events:
 * a press outside the card never reaches the card's own handlers, so it can only
 * be heard there. The listeners exist only while the tray is open, so a grid of
 * 24 closed cards holds none.
 *
 * Escape is prevented once it has closed the tray, so a tray inside the search
 * panel closes on its own rather than taking the whole panel with it.
 */
export function useTrayDismissal(
  isOpen: boolean,
  onClose: () => void,
  areas: {
    readonly actions: RefObject<HTMLElement | null>;
    readonly toggle: RefObject<HTMLElement | null>;
  },
): void {
  const { actions, toggle } = areas;

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (trayDismissalFor({ kind: 'KEY', key: event.key }) === 'KEEP_OPEN') return;
      event.preventDefault();
      onClose();
      toggle.current?.focus();
    };

    const onPointerDown = (event: PointerEvent): void => {
      const isInsideActions =
        event.target instanceof Node && (actions.current?.contains(event.target) ?? false);
      if (trayDismissalFor({ kind: 'POINTER', isInsideActions }) === 'CLOSE') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen, onClose, actions, toggle]);
}
