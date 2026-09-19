'use client';

import { useEffect, useRef, type RefObject } from 'react';

import type { CartLineId } from '@/lib/domain/ids';

import { focusAfterRemoval } from '../lib/removal-focus';
import type { BagLine } from '../schemas/bag.schema';

export interface RemovalFocus {
  /**
   * A line's Remove control — or its Confirm button while the confirmation is
   * open, since only one of the two is mounted at a time. `null` on unmount.
   */
  registerRemoveControl: (lineId: CartLineId, control: HTMLButtonElement | null) => void;
  /** Where focus lands when the last line went, so it lands on something that says so. */
  emptyStateRef: RefObject<HTMLParagraphElement | null>;
  /** Arms the move for one removal the backend has just confirmed. */
  expect: (before: readonly CartLineId[], removed: CartLineId) => void;
}

interface PendingRemoval {
  readonly before: readonly CartLineId[];
  readonly removed: CartLineId;
}

/**
 * §30.3 / A11Y-02 — focus that survives a bag line being removed.
 *
 * The line that goes is the one holding the pressed Confirm button, so the
 * browser drops focus to the page. The move happens once the NEW lines are on
 * screen — the control it lands on has to exist — which is why it waits for a
 * render where the removed line is gone rather than firing when the answer
 * arrives. Which control is `focusAfterRemoval`'s pure rule (MOD-04).
 */
export function useRemovalFocus(lines: readonly BagLine[] | undefined): RemovalFocus {
  const controls = useRef(new Map<CartLineId, HTMLButtonElement>());
  const emptyStateRef = useRef<HTMLParagraphElement | null>(null);
  const pending = useRef<PendingRemoval | null>(null);

  useEffect(() => {
    const removal = pending.current;
    if (removal === null || lines === undefined) return;

    const after = lines.map((line) => line.id);
    if (after.includes(removal.removed)) return;

    pending.current = null;
    const target = focusAfterRemoval(removal.before, removal.removed, after);
    const control =
      target === null ? emptyStateRef.current : (controls.current.get(target) ?? null);
    control?.focus();
  }, [lines]);

  return {
    registerRemoveControl: (lineId, control) => {
      if (control === null) controls.current.delete(lineId);
      else controls.current.set(lineId, control);
    },
    emptyStateRef,
    expect: (before, removed) => {
      pending.current = { before, removed };
    },
  };
}
