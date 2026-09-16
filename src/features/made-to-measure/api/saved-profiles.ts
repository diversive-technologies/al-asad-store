import 'server-only';

import { logApiError } from '@/lib/utils/log';

import type { MeasurementProfiles } from '../schemas/profile.schema';
import { readProfileOwner } from './profile-owner';
import { fetchProfiles } from './profile-server';

const CONTEXT = 'made-to-measure';

/**
 * What this customer has already saved, for the studio to OFFER them.
 *
 * It answers with a list rather than a `Result`, and that is the decision worth
 * stating: saved measurements are a convenience laid over a form that works
 * without them. A customer who has never saved anything and a customer whose
 * profiles could not be read should see the same page — the one they came for —
 * rather than have the studio refuse to open because an optional read failed.
 *
 * ERR-10 — a genuine failure is still logged, once, here, where it becomes
 * silence on the page and has nowhere else to be noticed.
 */
export async function savedProfilesFor(): Promise<MeasurementProfiles> {
  const owner = await readProfileOwner();
  if (owner === null) return [];

  const result = await fetchProfiles(owner);
  if (result.ok) return result.value;

  /* A device token the module no longer knows — lost to a restart, or never
     issued — owns nothing. That is an answer rather than a fault, and it is the
     same one an unknown token gets on a save. */
  if (result.error.kind !== 'UNAUTHORIZED') logApiError(CONTEXT, result.error);
  return [];
}
