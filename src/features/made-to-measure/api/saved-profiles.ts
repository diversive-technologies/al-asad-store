import 'server-only';

import { logApiError } from '@/lib/utils/log';

import type { MeasurementProfiles } from '../schemas/profile.schema';
import { readProfileOwner } from './profile-owner';
import { fetchProfiles } from './profile-server';

const CONTEXT = 'made-to-measure';

/**
 * What this customer has saved, and whether the question could be answered.
 *
 * The two are kept apart because two screens need different things from the same
 * read. The studio OFFERS what is on file, so a read it cannot make is simply no
 * offer — silence there asserts nothing. The account page REPORTS what is on
 * file, and there the same silence becomes a sentence: "you have not saved any
 * measurements yet" is a claim about the customer's own record, and it must not
 * be made on the strength of a read that failed.
 *
 * ERR-10 — a genuine failure is logged once, here.
 */
export type SavedProfilesRead =
  | { readonly kind: 'READ'; readonly profiles: MeasurementProfiles }
  | { readonly kind: 'UNREADABLE' };

export async function readSavedProfiles(): Promise<SavedProfilesRead> {
  const owner = await readProfileOwner();
  /* Nobody to ask about: a browser with no cookie and no session has saved
     nothing, which is an answer rather than a failure to get one. */
  if (owner === null) return { kind: 'READ', profiles: [] };

  const result = await fetchProfiles(owner);
  if (result.ok) return { kind: 'READ', profiles: result.value };

  /* A device token the module no longer knows — lost to a restart, or never
     issued — genuinely owns nothing, which is the same answer a save gets. */
  if (result.error.kind === 'UNAUTHORIZED') return { kind: 'READ', profiles: [] };

  logApiError(CONTEXT, result.error);
  return { kind: 'UNREADABLE' };
}

/**
 * The same read for the studio, where a failure is no offer.
 *
 * Saved measurements are a convenience laid over a form that works without them:
 * a customer who has never saved and one whose profiles could not be read should
 * both get the page they came for rather than have the studio refuse to open.
 */
export async function savedProfilesFor(): Promise<MeasurementProfiles> {
  const read = await readSavedProfiles();
  return read.kind === 'READ' ? read.profiles : [];
}
