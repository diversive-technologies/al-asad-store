'use client';

import { flushSync } from 'react-dom';

import type { MeasurementPointId } from '@/lib/domain/ids';

import { fieldRowId } from '../lib/field-row';
import { measuringOrder } from '../lib/measurement-set';
import type { StudioPoint, StudioSet } from '../lib/studio-set';
import { keyOf, type FindingsSink } from '../lib/studio-step';
import type { MeasurementProfiles } from '../schemas/profile.schema';
import { useFieldNotes, type UseFieldNotesResult } from './use-field-notes';
import { useFocusMode, type FocusMode } from './use-focus-mode';
import { useMeasurementForm, type UseMeasurementFormResult } from './use-measurement-form';
import { useProfileSave, type UseProfileSaveResult } from './use-profile-save';
import { useSavedMeasurements, type UseSavedMeasurementsResult } from './use-saved-measurements';
import { useStudioChoices, type UseStudioChoicesResult } from './use-studio-choices';
import { useStudioSelection, type UseStudioSelectionResult } from './use-studio-selection';

export interface MeasurementStudioState {
  /** The list as the finishing choices leave it (`askedStudio`). */
  readonly asked: StudioSet;
  readonly choices: UseStudioChoicesResult;
  readonly measuring: UseMeasurementFormResult;
  readonly notes: UseFieldNotesResult;
  readonly saving: UseProfileSaveResult;
  readonly saved: UseSavedMeasurementsResult;
  readonly selection: UseStudioSelectionResult;
  readonly focus: FocusMode;
  /** The measurement in hand — only while the fields are the thing on screen. */
  readonly active: StudioPoint | null;
  readonly isEditing: boolean;
  /** From the review back to the fields: to one of them, or to the first. */
  readonly change: (id: MeasurementPointId | null) => void;
}

/* The two channels the server's answer runs into: what is wrong, in red on the
   fields, and what is only worth a second look, quietly under them. */
function findingsSink(
  measuring: UseMeasurementFormResult,
  notes: UseFieldNotesResult,
): FindingsSink {
  return {
    show: ({ refused, notes: asked, sent }) => {
      measuring.showFindings(refused, sent);
      notes.place(asked, sent);
    },
    acknowledged: () => notes.acknowledged(),
  };
}

/**
 * §34.6 — the studio's hooks, in step: the choices decide what is asked, the form
 * holds what is typed, the notes and the save carry the server's answers, and the
 * selection says which measurement the drawing shows.
 *
 * Everything below the choices works on the ASKED list, so a cuff is never
 * counted, stepped to or sent with a plain sleeve; a unit switch alone sees the
 * whole served list, so a figure set aside stays one its field accepts.
 */
export function useMeasurementStudio(
  studio: StudioSet,
  profiles: MeasurementProfiles,
): MeasurementStudioState {
  const choices = useStudioChoices(studio);
  const asked = choices.asked;
  const measuring = useMeasurementForm(asked.points, studio.points);
  const notes = useFieldNotes(
    asked.points,
    measuring.values,
    measuring.unit,
    keyOf(asked, choices.preferences),
    measuring.errorIds.length > 0,
  );
  const saving = useProfileSave(asked, choices.preferences, findingsSink(measuring, notes));
  /* Matched against the SERVED list rather than the asked one, so a figure a
     finishing choice has set aside is still carried and is there when the choice
     brings its field back. */
  const saved = useSavedMeasurements({ studio, profiles, measuring, choices });
  const selection = useStudioSelection(asked, (id) => {
    measuring.form.setFocus(id);
  });
  const isEditing = saving.step.kind === 'EDITING';
  const active = isEditing ? selection.active : null;
  // On a phone the chosen measurement takes the screen — see `useFocusMode`.
  const focus = useFocusMode(
    measuringOrder(asked.points),
    active?.id ?? null,
    selection.activate,
    selection.choose,
  );

  /* The fields are shown BEFORE focus moves into them — an input still hidden
     takes no focus, silently. */
  function change(id: MeasurementPointId | null): void {
    flushSync(() => {
      saving.edit();
    });
    if (id !== null) return selection.activate(id);
    const first = asked.points[0];
    if (first !== undefined) document.getElementById(fieldRowId(first.id))?.focus();
  }

  return {
    asked,
    choices,
    measuring,
    notes,
    saving,
    saved,
    selection,
    focus,
    active,
    isEditing,
    change,
  };
}
