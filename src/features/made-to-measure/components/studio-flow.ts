import type { FormEvent } from 'react';

import type { MeasurementPointId } from '@/lib/domain/ids';

import type { FocusMode } from '../hooks/use-focus-mode';
import type { UseFieldNotesResult } from '../hooks/use-field-notes';
import type { UseMeasurementFormResult } from '../hooks/use-measurement-form';
import type { UseProfileSaveResult } from '../hooks/use-profile-save';
import type { UseStudioChoicesResult } from '../hooks/use-studio-choices';
import type { UseStudioSelectionResult } from '../hooks/use-studio-selection';

/**
 * What the FIELDS need from the studio's hooks, handed down as one thing rather
 * than as six props that always travel together (CMP-06). The review and the
 * confirmation take the save's step on its own.
 */
export interface StudioFlow {
  readonly measuring: UseMeasurementFormResult;
  readonly focus: FocusMode;
  /** The finishing choices, which decide which fields are asked. */
  readonly choices: UseStudioChoicesResult;
  /** The figures the rules asked about, and what the customer answered. */
  readonly notes: UseFieldNotesResult;
  /** Validates the form, then asks the server's check. */
  readonly submitForCheck: (event: FormEvent<HTMLFormElement>) => void;
  /** A field took focus: show its measurement. */
  readonly activate: (id: MeasurementPointId) => void;
  /** Go to a measurement: show it, and put the caret in its field. */
  readonly jump: (id: MeasurementPointId) => void;
  /** Take another look at this one — the field, and the drawing beside it. */
  readonly measureAgain: (id: MeasurementPointId) => void;
}

export interface StudioFlowParts {
  readonly measuring: UseMeasurementFormResult;
  readonly focus: FocusMode;
  readonly choices: UseStudioChoicesResult;
  readonly notes: UseFieldNotesResult;
  readonly selection: UseStudioSelectionResult;
  readonly check: UseProfileSaveResult['check'];
}

/** The flow, from the hooks that make it. The check runs only on a submit. */
export function studioFlow({
  measuring,
  focus,
  choices,
  notes,
  selection,
  check,
}: StudioFlowParts): StudioFlow {
  return {
    measuring,
    focus,
    choices,
    notes,
    submitForCheck: (event) => {
      measuring.submit(event, () => check(measuring.typedEntries()));
    },
    activate: selection.choose,
    jump: selection.activate,
    /* The figure is never cleared or rewritten: taking another look is the
       customer's to do, and what they typed is theirs until they change it. */
    measureAgain: selection.activate,
  };
}
