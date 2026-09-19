/**
 * Which list the studio shows when the one the address asks for could not be
 * loaded.
 *
 * A style or a way of measuring is chosen by ADDRESS, and the studio stays
 * mounted across the navigation — which is what keeps every figure typed. A read
 * that fails on the way used to swap the whole studio for the unavailable page,
 * and a customer who pressed "Waistcoat suit" with eleven figures typed lost all
 * eleven to a network hiccup. So the studio keeps the last list it DID load,
 * figures and all, and says the new one could not be loaded. Only a studio that
 * has never loaded anything shows the unavailable page, since then there is
 * nothing on it to lose.
 *
 * STATE-02 — the list kept is the last one the server rendered, held only for as
 * long as the server has nothing to put in its place; it is never read while the
 * address's own list is there, and nothing is ever computed from it.
 *
 * MOD-04 — pure.
 */

import type { StudioSet, StyleChoice } from './studio-set';

/** One loaded list: the studio, and how the address came to it. */
export interface StudioData {
  readonly studio: StudioSet;
  readonly choice: StyleChoice;
}

export type ShownStudio =
  /** The list the address asked for. */
  | { readonly kind: 'LOADED'; readonly data: StudioData }
  /** The address's list could not be loaded; the last one that was stays on screen. */
  | { readonly kind: 'KEPT'; readonly data: StudioData }
  /** Nothing has loaded yet, so there is no studio to keep. */
  | { readonly kind: 'UNAVAILABLE' };

/** The last list loaded, once this render's answer is in: the new one if there is one. */
export const lastLoadedAfter = (
  lastLoaded: StudioData | null,
  loaded: StudioData | null,
): StudioData | null => loaded ?? lastLoaded;

export function shownStudio(loaded: StudioData | null, lastLoaded: StudioData | null): ShownStudio {
  if (loaded !== null) return { kind: 'LOADED', data: loaded };
  return lastLoaded === null ? { kind: 'UNAVAILABLE' } : { kind: 'KEPT', data: lastLoaded };
}
