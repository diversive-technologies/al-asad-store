'use client';

import { useState } from 'react';

import { figureShownIn, savedChoices, savedOffer, type SavedOffer } from '../lib/saved-figures';
import { listIdOf, type StudioSet } from '../lib/studio-set';
import type { MeasurementProfiles } from '../schemas/profile.schema';
import type { UseMeasurementFormResult } from './use-measurement-form';
import type { PlacedFigure } from './use-unit-conversion';
import type { UseStudioChoicesResult } from './use-studio-choices';

export interface UseSavedMeasurementsResult {
  /** What the saved profiles can put into this list, or null when they hold nothing it asks. */
  readonly offer: SavedOffer | null;
  /** Whether the customer has taken THIS list's offer. */
  readonly taken: boolean;
  readonly take: () => void;
}

export interface SavedMeasurementsParts {
  /** The SERVED list, not the asked one — a figure set aside by a choice is still kept. */
  readonly studio: StudioSet;
  readonly profiles: MeasurementProfiles;
  readonly measuring: UseMeasurementFormResult;
  readonly choices: UseStudioChoicesResult;
}

/**
 * The offer of what a customer has already saved, and the one action that takes
 * it. Nothing is filled in until they say so.
 *
 * "Taken" is remembered as the LIST it was taken for rather than as a flag, so a
 * switch of style or of capture path brings the new list's own offer back by
 * derivation — the studio stays mounted across a switch, and a boolean would
 * have stayed true over a list the customer has not been offered anything for.
 */
export function useSavedMeasurements({
  studio,
  profiles,
  measuring,
  choices,
}: SavedMeasurementsParts): UseSavedMeasurementsResult {
  const [takenList, setTakenList] = useState<string | null>(null);
  const listId = listIdOf(studio);
  const offer = savedOffer(studio, profiles);

  return {
    offer,
    taken: takenList === listId,
    take: () => {
      if (offer === null) return;
      /* The finishing choices FIRST: they decide which measurements are asked, so
         a cuff figure put in before them would land on a field that is not there
         yet. A figure on a point a choice then sets aside is kept either way —
         the studio has held those since the choices landed. */
      for (const preference of savedChoices(studio.options, offer.lead)) {
        choices.choose(preference.group, preference.value);
      }
      const placed: PlacedFigure[] = [];
      for (const figure of offer.figures) {
        const point = studio.points.find((candidate) => candidate.id === figure.pointId);
        if (point === undefined) continue;
        const shown = figureShownIn(figure, point, measuring.unit);
        measuring.form.setValue(figure.pointId, shown, { shouldDirty: true });
        placed.push({
          pointId: figure.pointId,
          typed: { raw: figure.raw, unit: figure.unit },
          shown,
        });
      }
      /* The figure was typed once, in a unit of the customer's choosing, and that
         is what the record keeps. Told what was placed, a later unit switch
         converts from the ORIGINAL rather than from the conversion, and what is
         sent back is the figure on file rather than a rounding of it. */
      measuring.remember(placed);
      /* A programmatic write fires no change event, so react-hook-form leaves the
         previous check's errors exactly where they were: without this, filling
         eight fields from a saved profile left all eight red, the summary still
         listing them, beside a status line saying they had just been filled. */
      measuring.judgeAgain();
      setTakenList(listId);
    },
  };
}
