import 'server-only';

import type { Locale } from '@/i18n/locales';
import { logApiError, logContentIssue } from '@/lib/utils/log';

import { figuresNotAsked, savedGroups } from '../lib/saved-view';
import { joinCopy, styleLabelOf, type StudioSet } from '../lib/studio-set';
import type { ReviewGroup } from '../lib/review';
import type { MeasurementProfile } from '../schemas/profile.schema';
import { fetchMeasurementCopy, fetchMeasurementSet, fetchStyleOffers } from './fetch-studio';
import { readSavedProfiles } from './saved-profiles';

const CONTEXT = 'made-to-measure';

export interface SavedProfileView {
  readonly profile: MeasurementProfile;
  /** The style by the name the studio gives it, or '' where this language has none. */
  readonly styleLabel: string;
  /** Garment by garment, as the review shows them — empty when the words are missing. */
  readonly groups: readonly ReviewGroup[];
  /** Figures on file the current guide no longer asks for. */
  readonly notAsked: number;
}

export interface SavedMeasurements {
  readonly views: readonly SavedProfileView[];
  /**
   * Why there is nothing to show, when the reason is not "nothing is saved".
   *
   * `RECORD` — what this customer has saved could not be read at all.
   * `GUIDE` — they have saved something, and the words to show it are missing.
   *
   * Kept apart from an empty list on purpose, and kept apart from EACH OTHER for
   * the same reason: "you have not saved anything", "we cannot reach your
   * record" and "we cannot show you what is in it" are three different
   * sentences, and saying the first when either of the others is true would be a
   * lie about the customer's own record.
   */
  readonly unreadable: 'RECORD' | 'GUIDE' | null;
}

const NOTHING: SavedMeasurements = { views: [], unreadable: null };

/* One profile's rows. The set is read at its CURRENT version rather than the one
   the figures were saved against: the question this page answers is what the
   guide asks for now, and the studio itself says so when a guide has moved on. */
async function viewOf(
  profile: MeasurementProfile,
  offers: Parameters<typeof joinCopy>[1],
  copy: Parameters<typeof joinCopy>[2],
): Promise<SavedProfileView> {
  const bare: SavedProfileView = {
    profile,
    styleLabel: '',
    groups: [],
    notAsked: 0,
  };

  const served = await fetchMeasurementSet(profile.garmentStyle, profile.source);
  if (!served.ok) {
    logApiError(CONTEXT, served.error);
    return bare;
  }
  if (served.value === null) {
    logContentIssue(CONTEXT, `saved ${profile.garmentStyle}/${profile.source} is no longer served`);
    return bare;
  }

  const joined = joinCopy(served.value, offers, copy);
  if (!joined.ok) {
    logContentIssue(CONTEXT, `no wording for ${joined.error.join(', ')}`);
    return bare;
  }

  const studio: StudioSet = joined.value.studio;
  return {
    profile,
    styleLabel: styleLabelOf(joined.value.styles, profile.garmentStyle),
    groups: savedGroups(studio, profile),
    notAsked: figuresNotAsked(studio, profile),
  };
}

/**
 * Everything this customer has on file, ready to show.
 *
 * A saved profile carries point IDS and no words (§34.3), so the account page
 * needs the same two content reads the studio makes — the style offers and the
 * wording — plus one list per profile to say which garment each figure belongs
 * to. All are cached and tagged, so a returning customer's page is cache reads.
 *
 * A profile whose list or wording cannot be read still appears, with its date and
 * a way in: the customer's own record must not vanish because content did.
 */
export async function loadSavedMeasurements(locale: Locale): Promise<SavedMeasurements> {
  /* The RECORD read, not the studio's forgiving one: this page's whole job is to
     report what is on file, so a read it could not make has to be said rather
     than shown as an empty shelf. */
  const read = await readSavedProfiles();
  if (read.kind === 'UNREADABLE') return { views: [], unreadable: 'RECORD' };
  if (read.profiles.length === 0) return NOTHING;

  const [offers, copy] = await Promise.all([fetchStyleOffers(), fetchMeasurementCopy(locale)]);
  if (!offers.ok) {
    logApiError(CONTEXT, offers.error);
    return { views: [], unreadable: 'GUIDE' };
  }
  if (!copy.ok) {
    logApiError(CONTEXT, copy.error);
    return { views: [], unreadable: 'GUIDE' };
  }

  const views = await Promise.all(
    read.profiles.map((profile) => viewOf(profile, offers.value, copy.value)),
  );
  return { views, unreadable: null };
}
