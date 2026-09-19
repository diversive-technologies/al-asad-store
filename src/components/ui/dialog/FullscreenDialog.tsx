'use client';

import type { KeyboardEvent, ReactNode } from 'react';

import { X } from '@/lib/vendor/icons';

import { useNativeDialog } from './use-native-dialog';

export interface FullscreenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** A11Y-04: the accessible name of the dialog, also shown in its bar. */
  title: string;
  /** Accessible name for the close button. */
  closeLabel: string;
  /**
   * Keys pressed anywhere inside the dialog, the close button included. On the
   * dialog rather than on the content, so a key handled by the content still
   * works while focus is on the bar.
   */
  onKeyDown?: (event: KeyboardEvent<HTMLDialogElement>) => void;
  children: ReactNode;
}

/** Matched by `fullscreen-dialog` in globals.css — the two have to agree. */
const EXIT_MS = 180;

/**
 * A11Y-08 — a modal that takes the WHOLE screen, the third sibling of `Dialog`
 * and `SlideOver`.
 *
 * Same platform primitive and the same reasoning: `<dialog>` with `showModal()`
 * gives the focus trap, `Escape`, focus restore, the top layer and an inert page
 * behind it. The lifecycle is shared through `useNativeDialog` rather than
 * copied (PD-01).
 *
 * The shape is for looking at one thing as large as the screen allows — a
 * product's photographs. A centred card would spend a phone's width on margins,
 * and an edge drawer is for lists.
 *
 * Nothing here touches the viewport's zoom: no `touch-action`, and no gesture is
 * prevented, because §30.3 says pinch-zoom is never disabled — and a full-screen
 * photograph is exactly where somebody reaches for it.
 *
 * There is no click-outside: the panel IS the whole screen, so there is no
 * outside. The close button and `Escape` are the ways out.
 */
export function FullscreenDialog({
  isOpen,
  onClose,
  title,
  closeLabel,
  onKeyDown,
  children,
}: FullscreenDialogProps) {
  const dialogRef = useNativeDialog(isOpen, EXIT_MS);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className="fullscreen-dialog"
      /*
       * `cancel` is Escape. Routed through `onClose` so the parent's state stays
       * the single source of truth for whether the dialog is open (PD-01).
       */
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={onKeyDown}
    >
      <div className="fullscreen-dialog-panel">
        <header className="border-border flex items-center justify-between gap-3 border-b px-4 py-2">
          <h2 className="text-fg min-w-0 truncate text-base font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="text-fg-muted hover:text-fg focus-visible:ring-brand-500 rounded-card shrink-0 p-2.5 focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </dialog>
  );
}
