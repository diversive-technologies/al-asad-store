'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';
import { X } from '@/lib/vendor/icons';

import { useNativeDialog } from './use-native-dialog';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** A11Y-04: the accessible name of the dialog itself. */
  title: string;
  /** Accessible name for the close button. */
  closeLabel: string;
  children: ReactNode;
  className?: string;
}

/** Matched by `modal-dialog` in globals.css — the two have to agree. */
const EXIT_MS = 180;

/**
 * A11Y-08 — a CENTRED modal, the sibling of `SlideOver`.
 *
 * Same platform primitive and same reasoning: `<dialog>` with `showModal()`
 * gives the focus trap, `Escape`, focus restore, the top layer and an inert page
 * behind it, correctly and for free. The lifecycle is shared with `SlideOver`
 * through `useNativeDialog` rather than copied (PD-01).
 *
 * The difference is shape, and the shape is the point. An edge drawer is right
 * for a list you scan down — a bag, a filter panel. A single focused task with
 * one thing to look at belongs in the middle of the screen, sized to its
 * content, so nothing competes with it.
 */
export function Dialog({ isOpen, onClose, title, closeLabel, children, className }: DialogProps) {
  const dialogRef = useNativeDialog(isOpen, EXIT_MS);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className={cn('modal-dialog', className)}
      /*
       * `cancel` is Escape. Routed through `onClose` so the parent's state stays
       * the single source of truth for whether the dialog is open (PD-01) — an
       * element closing itself behind React's back is how a dialog ends up
       * reopening on the next render.
       */
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      /* The dialog element IS the backdrop as far as hit-testing goes, so a
         click landing on it rather than on the card inside is a click outside. */
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="modal-dialog-card">
        <header className="border-border flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-fg text-base font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="text-fg-muted hover:text-fg focus-visible:ring-brand-500 rounded-card p-1 focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </dialog>
  );
}
