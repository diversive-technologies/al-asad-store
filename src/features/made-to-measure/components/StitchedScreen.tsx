import { ROUTES } from '@/config/routes';
import { getLocale } from '@/i18n';

import { loadStudio, type StudioRequest } from '../api/load-studio';
import { savedProfilesFor } from '../api/saved-profiles';
import { StudioHost } from './StudioHost';

export interface StitchedScreenProps {
  /** What the address asked for, already parsed; the loader decides what it gets. */
  readonly requested: StudioRequest;
}

/**
 * §34 — `/stitched`, assembled on the server from what the backend serves: the
 * styles on offer, the chosen style's measurement list for the chosen way of
 * measuring it, and the words for it.
 *
 * A list that could not be loaded is answered by the SAME component as one that
 * could (`StudioHost`), so choosing a style whose read fails keeps the studio —
 * and every figure typed in it — mounted rather than replacing it.
 */
export async function StitchedScreen({ requested }: StitchedScreenProps) {
  const locale = await getLocale();
  /* Read beside the list rather than after it: what the customer has already
     saved does not depend on which list is served, and it is never a reason for
     the page to fail — `savedProfilesFor` answers with an empty list, not an
     error, when there is nothing to read or the read goes wrong. */
  const [loaded, profiles] = await Promise.all([loadStudio(requested, locale), savedProfilesFor()]);

  return (
    <StudioHost
      loaded={loaded.ok ? loaded.value : null}
      retryHref={ROUTES.stitchedWith(requested)}
      profiles={profiles}
      locale={locale}
    />
  );
}
