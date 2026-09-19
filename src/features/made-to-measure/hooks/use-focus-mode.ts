'use client';

import type { CSSProperties } from 'react';
import { flushSync } from 'react-dom';

import { useVisibleHeight, useVisibleTop } from '@/hooks/use-visible-height';
import type { MeasurementPointId } from '@/lib/domain/ids';

import { fieldRowId } from '../lib/field-row';
import { stepFrom } from '../lib/measurement-set';
import { sceneEvents, type SceneEvents } from './focus-mode-events';

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

/* STY-01a — live screen measurements travel as custom properties, and the `as` is
   TS-03(4): `CSSProperties` has no index signature for a custom property. */
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

  return {
    leave,
    step: (direction: 1 | -1) => {
      if (activeId !== null) stepOn(activeId, direction);
    },
    events: sceneEvents({ order, activeId, setActive, leave, stepOn }),
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
