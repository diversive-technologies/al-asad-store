'use client';

import type { Locale } from '@/i18n/locales';

import { useSavedMeasurements, type SavedMeasurementsParts } from '../hooks/use-saved-measurements';
import type { StyleOption } from '../lib/studio-set';
import { SavedMeasurements } from './SavedMeasurements';

export interface SavedOfferProps extends SavedMeasurementsParts {
  /** The styles on offer, which is where a style's name lives. */
  readonly styles: readonly StyleOption[];
  readonly locale: Locale;
}

/**
 * The offer of what a customer has already saved, with the state of having taken
 * it. Its own module so that the matching of saved figures to the list
 * (`saved-figures`), the hook and the section are downloaded only for a customer
 * who has saved some (`MeasurementStudio` has the reasoning). It stays mounted
 * for as long as the studio holds saved profiles, so "taken" is remembered across
 * a switch of style or path as it always was.
 */
export function SavedOffer({
  studio,
  profiles,
  measuring,
  choices,
  styles,
  locale,
}: SavedOfferProps) {
  /* Matched against the SERVED list rather than the asked one, so a figure a
     finishing choice has set aside is still carried and is there when the choice
     brings its field back. */
  const saved = useSavedMeasurements({ studio, profiles, measuring, choices });

  if (saved.offer === null) return null;

  return (
    <SavedMeasurements
      offer={saved.offer}
      taken={saved.taken}
      onTake={saved.take}
      studio={studio}
      styles={styles}
      locale={locale}
    />
  );
}
