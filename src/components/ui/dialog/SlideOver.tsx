'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';
import { X } from '@/lib/vendor/icons';

import { useNativeDialog } from './use-native-dialog';

export interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  /** A11Y-04: the accessible name of the dialog itself. */
  title: string;
  /** Accessible name for the close button. */
  closeLabel: string;
  /** `inline-end` for the bag; `inline-start` suits a filter drawer. */
  side?: 'inline-start' | 'inline-end';
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * How long the exit takes, matched by `slide-over-motion` in globals.css. The
 * element cannot be closed until its transition has played, so this number and
 * the CSS have to agree.
 */
const EXIT_MS = 220;

/**
 * A11Y-08 — a modal slide-over, built on the native `<dialog>` element.
 *
 * The rule says to use a headless accessible primitive rather than hand-rolling.
 * `<dialog>` with `showModal()` IS that primitive — the platform's — and it is
 * the reason no dependency was added (BASE-01). It gives, for free and
 * correctly:
 *
 * - a real focus trap, including from the browser's own UI;
 * - `Escape` to dismiss, via `cancel`;
 * - focus restored to the element that opened it;
 * - the rest of the page marked inert, so a screen reader cannot wander out;
 * - `role="dialog"` and modal semantics without a single `aria-*` attribute
 *   (A11Y-11: ARIA only where semantic HTML cannot express the meaning).
 *
 * Hand-rolling a focus trap over a `<div>` would be several hundred lines of
 * the subtlest code in any component library, and it would be wrong.
 *
 * Reused by M2's filter drawer, which is why `side` exists and why this lives
 * in `components/ui` rather than inside the bag feature.
 */
export function SlideOver({
  isOpen,
  onClose,
  title,
  closeLabel,
  side = 'inline-end',
  children,
  footer,
}: SlideOverProps) {
  // PD-01: the lifecycle is shared with `Dialog` rather than kept in two places.
  const dialogRef = useNativeDialog(isOpen, EXIT_MS);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className={cn(
        'slide-over slide-over-motion',
        side === 'inline-start' ? 'slide-over-start' : null,
      )}
      /*
       * `cancel` is Escape. Routed through `onClose` so the parent's state is
       * the single source of truth for whether the panel is open (PD-01) — the
       * element closing itself behind React's back is exactly how a dialog ends
       * up reopening on the next render.
       */
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      /* Clicking the backdrop. The dialog element IS the backdrop as far as
         hit-testing goes, so a click landing on it rather than on the panel
         inside is a click outside. */
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="slide-over-panel">
        <header className="border-border flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-fg text-lg font-medium">{title}</h2>
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

        {footer === undefined ? null : (
          <footer className="border-border border-t px-5 py-4">{footer}</footer>
        )}
      </div>
    </dialog>
  );
}
