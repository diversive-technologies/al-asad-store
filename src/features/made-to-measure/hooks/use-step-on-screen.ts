'use client';

import { useEffect, useRef, useState } from 'react';

import { sentKey, type StudioStep } from '../lib/studio-step';
import type { MeasurementSubmission } from '../schemas/profile.schema';

export interface StepOnScreen {
  /** The step the studio was moved to, for the list and choices now on screen. */
  readonly kind: StudioStep['kind'];
  /** Whether an answer is about the list and choices on screen as it lands. */
  readonly isCurrent: (sent: MeasurementSubmission) => boolean;
  /** Moves to a step, for the list and choices an answer was sent with. */
  readonly show: (sent: MeasurementSubmission, step: StudioStep['kind']) => void;
  /** Back to the fields. */
  readonly edit: () => void;
}

/**
 * Which step an answer moved the studio to — and for WHICH list and choices
 * (`keyOf`), so a step is only ever shown against the pair it was reached with.
 * A new list or new choices start at the fields, by React's pattern for state
 * that follows a prop; the figures are the form's, and stay.
 */
export function useStepOnScreen(key: string): StepOnScreen {
  const [shown, setShown] = useState<{ key: string; step: StudioStep['kind'] }>({
    key,
    step: 'EDITING',
  });
  // STATE-04 — the pair on screen: written after commit, read once a request settles.
  const onScreen = useRef(key);
  useEffect(() => {
    onScreen.current = key;
  }, [key]);

  if (shown.key !== key) setShown({ key, step: 'EDITING' });

  return {
    kind: shown.key === key ? shown.step : 'EDITING',
    isCurrent: (sent) => sentKey(sent) === onScreen.current,
    show: (sent, step) => {
      setShown({ key: sentKey(sent), step });
    },
    edit: () => {
      setShown({ key, step: 'EDITING' });
    },
  };
}
