'use client';

import { useState } from 'react';

import type { Locale } from '@/i18n/locales';
import { useMessages } from '@/i18n/use-messages';

import { lastLoadedAfter, shownStudio, type StudioData } from '../lib/studio-shown';
import type { MeasurementProfiles } from '../schemas/profile.schema';
import { MeasurementStudio } from './MeasurementStudio';
import { StudioLoadFailure } from './StudioLoadFailure';
import { StudioUnavailable } from './StudioUnavailable';

export interface StudioHostProps {
  /** The list the address asked for, or null when it could not be loaded. */
  readonly loaded: StudioData | null;
  /** The address that was asked for, so asking again asks for the same list. */
  readonly retryHref: string;
  /** What this customer has already saved — empty for anyone who has saved nothing. */
  readonly profiles: MeasurementProfiles;
  readonly locale: Locale;
}

/**
 * The studio, kept on screen through a list that could not be loaded.
 *
 * Choosing a style or a way of measuring is a navigation, and the studio survives
 * it because the server answers with this same component in the same place.
 * Answering a failed read with the unavailable page instead put a DIFFERENT
 * component there, so React unmounted the form and every figure typed since the
 * last save went with it. This host is what both answers render, and it keeps the
 * last list it loaded, with the failure said above the fields (`shownStudio`). A
 * customer who has typed nothing — the first load failed — gets the unavailable
 * page as before.
 *
 * STATE-02 — the list kept is the server's last answer, never a copy kept in step
 * with it: while the address's own list is there, that is what renders.
 */
export function StudioHost({ loaded, retryHref, profiles, locale }: StudioHostProps) {
  const messages = useMessages();
  const [lastLoaded, setLastLoaded] = useState(loaded);
  // React's pattern for state that follows a prop: set while rendering, once.
  const remembered = lastLoadedAfter(lastLoaded, loaded);
  if (remembered !== lastLoaded) setLastLoaded(remembered);

  const shown = shownStudio(loaded, lastLoaded);
  if (shown.kind === 'UNAVAILABLE') {
    return <StudioUnavailable retryHref={retryHref} messages={messages} />;
  }

  return (
    <MeasurementStudio
      studio={shown.data.studio}
      choice={shown.data.choice}
      profiles={profiles}
      notice={shown.kind === 'KEPT' ? <StudioLoadFailure /> : null}
      locale={locale}
    />
  );
}
