'use client';

import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';

import { useObjectUrl } from '@/hooks/use-object-url';
import type { Locale } from '@/i18n/locales';

import { useMeasurementStudio } from '../hooks/use-measurement-studio';
import type { StudioSet, StyleChoice } from '../lib/studio-set';
import type { MeasurementProfiles } from '../schemas/profile.schema';
import { MeasurementPanel } from './MeasurementPanel';
import { MeasurementStage } from './MeasurementStage';
import type { SavedOfferProps } from './SavedOffer';
import { studioFlow } from './studio-flow';

/*
 * Deliberate code split (PERF-10, L-01): the offer to reuse saved figures — the
 * matching of what is on file to this list, and the section that offers it — is
 * drawn only for a signed-in customer who has saved some, yet it sat in the first
 * load of every visit and, with the rest, put `/stitched` over its 200 kB budget.
 * Now it is downloaded only when the page arrived with saved profiles.
 *
 * `lazy` rather than `onDemandPart` because the offer is still rendered on the
 * server: it is in the page's HTML, and the form does not wait for it. A download
 * that fails leaves the offer out (it is a convenience, never a step) rather than
 * throwing into the route's error page, which would take every figure typed.
 */
type SavedOfferComponent = ComponentType<SavedOfferProps>;
const SavedOffer = lazy(() =>
  import('./SavedOffer').then<{ default: SavedOfferComponent }, { default: SavedOfferComponent }>(
    (module) => ({ default: module.SavedOffer }),
    () => ({ default: () => null }),
  ),
);

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
  const { asked, choices, measuring, notes, saving, selection, focus, ...fields } =
    useMeasurementStudio(studio);
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
            profiles.length === 0 ? null : (
              <Suspense fallback={null}>
                <SavedOffer
                  studio={studio}
                  profiles={profiles}
                  measuring={measuring}
                  choices={choices}
                  styles={choice.options}
                  locale={locale}
                />
              </Suspense>
            ),
        }}
        onChange={fields.change}
        locale={locale}
      />
    </div>
  );
}
