import type { FocusEvent, KeyboardEvent } from 'react';

import type { MeasurementPointId } from '@/lib/domain/ids';

/** The scene's own keyboard and focus events, which keep focus mode in step. */
export type SceneEvents = {
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly onFocus: (event: FocusEvent<HTMLDivElement>) => void;
  readonly onBlur: (event: FocusEvent<HTMLDivElement>) => void;
};

/** On exactly when the stylesheet draws the stepper, so the breakpoint lives there. */
function isOn(scene: HTMLElement): boolean {
  const stepper = scene.querySelector('.mm-stepper');
  return stepper !== null && stepper.getClientRects().length > 0;
}

/** The measurement an event's target is the input for, if it is one. */
function measurementOf(
  order: readonly MeasurementPointId[],
  target: EventTarget | null,
): MeasurementPointId | null {
  if (!(target instanceof HTMLInputElement)) return null;
  return order.find((id) => id === target.name) ?? null;
}

export interface SceneEventParts {
  /** The order the stepper walks. */
  readonly order: readonly MeasurementPointId[];
  readonly activeId: MeasurementPointId | null;
  readonly setActive: (id: MeasurementPointId | null) => void;
  /** Ends focus mode, handing focus back to the field's row. */
  readonly leave: () => void;
  /** Moves on from a measurement, or ends focus mode at the end of the walk. */
  readonly stepOn: (from: MeasurementPointId, direction: 1 | -1) => void;
}

/**
 * What the scene listens for while a measurement is active — nothing, unless the
 * stylesheet has actually turned focus mode on (`useFocusMode`).
 */
export function sceneEvents({
  order,
  activeId,
  setActive,
  leave,
  stepOn,
}: SceneEventParts): SceneEvents {
  return {
    onKeyDown(event) {
      if (activeId === null || !isOn(event.currentTarget)) return;
      const id = measurementOf(order, event.target);
      if (event.key === 'Escape') {
        event.preventDefault();
        leave();
      } else if (event.key === 'Enter' && id !== null) {
        /* Return moves on from the field it was pressed in, and never submits
           the whole form with every other field out of sight. */
        event.preventDefault();
        stepOn(id, 1);
      }
    },
    /* Whatever field the keyboard lands in — Tab, a phone's next-field arrow —
       becomes the one shown, so the caret is never in a field nobody can see. */
    onFocus(event) {
      const id = measurementOf(order, event.target);
      if (activeId === null || id === null || id === activeId) return;
      if (isOn(event.currentTarget)) setActive(id);
    },
    /* Focus leaving for the page beneath the sheet — Tab past Done, a phone's
       arrow onto the footer's email field — ends focus mode, so what has focus is
       visible again. A null target is a tap on empty space and ends nothing. */
    onBlur(event) {
      const next = event.relatedTarget;
      if (activeId === null || !(next instanceof Node)) return;
      if (event.currentTarget.contains(next) || !isOn(event.currentTarget)) return;
      setActive(null);
    },
  };
}
