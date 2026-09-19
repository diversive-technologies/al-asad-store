'use client';

import type { ReactNode } from 'react';

import { useObjectUrl } from '@/hooks/use-object-url';
import type { Locale } from '@/i18n/locales';

import { useMeasurementStudio } from '../hooks/use-measurement-studio';
import type { StudioSet, StyleChoice } from '../lib/studio-set';
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
  /** A list the address asked for that could not be loaded, or nothing (`StudioHost`). */
  readonly notice: ReactNode;
  readonly locale: Locale;
}

/**
 * §34.6 — the drawing and the form, in step, with the FORM leading.
 *
 * Focusing a field brings up that garment and marks the measurement on it, which
 * answers the question a customer actually has ("where do I put the tape?") at
 * the moment they have it. Clicking a mark focuses its field. While the review or
 * the confirmation shows, the drawing is only a picture: its marks would reach
 * for fields that are not on screen. How the hooks work together is
 * `useMeasurementStudio`'s.
 */
export function MeasurementStudio({
  studio,
  choice,
  profiles,
  notice,
  locale,
}: MeasurementStudioProps) {
  // Held here, above every switch of style or path, until the page closes.
  const cardPhoto = useObjectUrl();
  const { asked, choices, measuring, notes, saving, saved, selection, focus, ...fields } =
    useMeasurementStudio(studio, profiles);
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
        active={fields.active}
        measuring={measuring}
        onBrowse={selection.browse}
        onSelect={fields.isEditing ? selection.activate : null}
        locale={locale}
      />
      <MeasurementPanel
        studio={asked}
        choice={choice}
        flow={flow}
        saving={saving}
        slots={{
          notice,
          saved:
            saved.offer === null ? null : (
              <SavedMeasurements
                offer={saved.offer}
                taken={saved.taken}
                onTake={saved.take}
                studio={studio}
                styles={choice.options}
                locale={locale}
              />
            ),
        }}
        onChange={fields.change}
        locale={locale}
      />
    </div>
  );
}
