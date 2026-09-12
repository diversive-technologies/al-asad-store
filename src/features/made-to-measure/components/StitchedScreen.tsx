import { ROUTES } from '@/config/routes';
import { getLocale, getMessages } from '@/i18n';

import { loadStudio, type StudioRequest } from '../api/load-studio';
import { MeasurementStudio } from './MeasurementStudio';
import { StudioUnavailable } from './StudioUnavailable';

export interface StitchedScreenProps {
  /** What the address asked for, already parsed; the loader decides what it gets. */
  readonly requested: StudioRequest;
}

/**
 * §34 — `/stitched`, assembled on the server from what the backend serves: the
 * styles on offer, the chosen style's measurement list for the chosen way of
 * measuring it, and the words for it.
 */
export async function StitchedScreen({ requested }: StitchedScreenProps) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  const loaded = await loadStudio(requested, locale);

  if (!loaded.ok) {
    return <StudioUnavailable retryHref={ROUTES.stitchedWith(requested)} messages={messages} />;
  }

  return (
    <MeasurementStudio studio={loaded.value.studio} choice={loaded.value.choice} locale={locale} />
  );
}
