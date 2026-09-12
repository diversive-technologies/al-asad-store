'use client';

import type { CSSProperties, FocusEvent, KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';

import { useVisibleHeight, useVisibleTop } from '@/hooks/use-visible-height';
import type { MeasurementPointId } from '@/lib/domain/ids';

import { fieldRowId } from '../lib/field-row';
import { stepFrom } from '../lib/measurement-set';

type SceneEvents = {
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly onFocus: (event: FocusEvent<HTMLDivElement>) => void;
  readonly onBlur: (event: FocusEvent<HTMLDivElement>) => void;
};

export interface FocusMode {
  readonly activeId: MeasurementPointId | null;
  /** The served list's order, which is the order the stepper walks. */
  readonly order: readonly MeasurementPointId[];
  readonly step: (direction: 1 | -1) => void;
  readonly leave: () => void;
  readonly sceneProps: SceneEvents & {
    readonly 'data-focused': '' | undefined;
    readonly style: CSSProperties | undefined;
  };
}

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

/* STY-01a — live measurements of the screen, so they travel as custom
   properties; the stylesheet decides whether anything reads them. */
function viewportStyle(height: number | null, top: number | null): CSSProperties | undefined {
  if (height === null || top === null) return undefined;
  return { '--mm-visible': `${String(height)}px`, '--mm-top': `${String(top)}px` } as CSSProperties;
}

function handlers(
  order: readonly MeasurementPointId[],
  activeId: MeasurementPointId | null,
  go: (id: MeasurementPointId) => void,
  setActive: (id: MeasurementPointId | null) => void,
) {
  function leave(): void {
    if (activeId === null) return;
    const row = fieldRowId(activeId);
    // The list is laid out again only once focus mode is off, so commit that first.
    flushSync(() => {
      setActive(null);
    });
    /* The ROW, not its input: focusing the input would open the keyboard and put
       the customer straight back into focus mode. */
    const element = document.getElementById(row);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: 'center' });
  }

  function stepOn(from: MeasurementPointId, direction: 1 | -1): void {
    const next = stepFrom(order, from, direction);
    if (next === null) leave();
    else go(next);
  }

  const events: SceneEvents = {
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

  return {
    leave,
    step: (direction: 1 | -1) => {
      if (activeId !== null) stepOn(activeId, direction);
    },
    events,
  };
}

/**
 * FOCUS MODE — on the stacked layout, the chosen measurement takes the screen.
 *
 * Stacked, the drawing is pinned to the top and the form scrolls up OVER it, so on
 * a phone the guide was covered at the exact moment somebody reached a field. While
 * a measurement is active the stylesheet shows that one field and gives the rest
 * of the screen to the drawing; this hook supplies the stepping, keeps the caret
 * in the field that is shown, and places the sheet where the keyboard leaves room.
 */
export function useFocusMode(
  order: readonly MeasurementPointId[],
  activeId: MeasurementPointId | null,
  go: (id: MeasurementPointId) => void,
  setActive: (id: MeasurementPointId | null) => void,
): FocusMode {
  const height = useVisibleHeight();
  const top = useVisibleTop();
  const { leave, step, events } = handlers(order, activeId, go, setActive);

  return {
    activeId,
    order,
    step,
    leave,
    sceneProps: {
      'data-focused': activeId === null ? undefined : '',
      style: viewportStyle(height, top),
      ...events,
    },
  };
}
