'use client';

import { flushSync } from 'react-dom';

import { useObjectUrl } from '@/hooks/use-object-url';
import type { Locale } from '@/i18n/locales';
import type { MeasurementPointId } from '@/lib/domain/ids';

import { useFieldNotes } from '../hooks/use-field-notes';
import { useFocusMode } from '../hooks/use-focus-mode';
import { useMeasurementForm } from '../hooks/use-measurement-form';
import { useProfileSave } from '../hooks/use-profile-save';
import { useSavedMeasurements } from '../hooks/use-saved-measurements';
import { useStudioChoices } from '../hooks/use-studio-choices';
import { useStudioSelection } from '../hooks/use-studio-selection';
import { fieldRowId } from '../lib/field-row';
import { measuringOrder } from '../lib/measurement-set';
import type { StudioSet, StyleChoice } from '../lib/studio-set';
import { keyOf, type FindingsSink } from '../lib/studio-step';
import type { MeasurementProfiles } from '../schemas/profile.schema';
import { MeasurementPanel } from './MeasurementPanel';
import { MeasurementStage } from './MeasurementStage';
import { SavedMeasurements } from './SavedMeasurements';
import { studioFlow } from './studio-flow';

export interface MeasurementStudioProps {
  readonly studio: StudioSet;
  readonly choice: StyleChoice;
  /** What this customer has already saved — empty for anyone who has saved nothing. */
  readonly profiles: MeasurementProfiles;
  readonly locale: Locale;
}

/**
 * §34.6 — the drawing and the form, in step, with the FORM leading.
 *
 * Focusing a field brings up that garment and marks the measurement on it, which
 * answers the question a customer actually has ("where do I put the tape?") at
 * the moment they have it. Clicking a mark focuses its field. While the review or
 * the confirmation shows, the drawing is only a picture: its marks would reach
 * for fields that are not on screen.
 *
 * Everything below the choices works on the ASKED list (`askedStudio`), so a cuff
 * is never counted, stepped to or sent with a plain sleeve; a unit switch alone
 * sees the whole served list, so a figure set aside stays one its field accepts.
 */
export function MeasurementStudio({ studio, choice, profiles, locale }: MeasurementStudioProps) {
  const choices = useStudioChoices(studio);
  const asked = choices.asked;
  // Held here, above every switch of style or path, until the page closes.
  const cardPhoto = useObjectUrl();
  const measuring = useMeasurementForm(asked.points, studio.points);
  /* The two channels the server's answer runs into: what is wrong, in red on the
     fields, and what is only worth a second look, quietly under them. */
  const notes = useFieldNotes(
    asked.points,
    measuring.values,
    measuring.unit,
    keyOf(asked, choices.preferences),
    measuring.errorIds.length > 0,
  );
  const sink: FindingsSink = {
    show: ({ refused, notes: asked_, sent }) => {
      measuring.showFindings(refused, sent);
      notes.place(asked_, sent);
    },
    acknowledged: () => notes.acknowledged(),
  };
  const saving = useProfileSave(asked, choices.preferences, sink);
  /* Matched against the SERVED list rather than the asked one, so a figure a
     finishing choice has set aside is still carried and is there when the choice
     brings its field back. */
  const saved = useSavedMeasurements({ studio, profiles, measuring, choices });
  const selection = useStudioSelection(asked, (id) => {
    measuring.form.setFocus(id);
  });
  const isEditing = saving.step.kind === 'EDITING';
  const active = isEditing ? selection.active : null;

  /* From the review back to a field. The fields are shown BEFORE focus moves
     into them — an input still hidden takes no focus, silently. */
  function change(id: MeasurementPointId | null): void {
    flushSync(() => {
      saving.edit();
    });
    if (id !== null) return selection.activate(id);
    const first = asked.points[0];
    if (first !== undefined) document.getElementById(fieldRowId(first.id))?.focus();
  }

  // On a phone the chosen measurement takes the screen — see `useFocusMode`.
  const focus = useFocusMode(
    measuringOrder(asked.points),
    active?.id ?? null,
    selection.activate,
    selection.choose,
  );
  const flow = studioFlow({ measuring, focus, choices, notes, selection, check: saving.check });

  return (
    <div className="mm-scene z-sheet" {...focus.sceneProps}>
      <MeasurementStage
        studio={asked}
        shown={{
          piece: selection.piece,
          variants: choices.variantsOn(selection.piece.id),
          note: cardPhoto,
        }}
        active={active}
        measuring={measuring}
        onBrowse={selection.browse}
        onSelect={isEditing ? selection.activate : null}
        locale={locale}
      />
      <MeasurementPanel
        studio={asked}
        choice={choice}
        flow={flow}
        saving={saving}
        saved={
          saved.offer === null ? null : (
            <SavedMeasurements
              offer={saved.offer}
              taken={saved.taken}
              onTake={saved.take}
              studio={studio}
              styles={choice.options}
              locale={locale}
            />
          )
        }
        onChange={change}
        locale={locale}
      />
    </div>
  );
}
