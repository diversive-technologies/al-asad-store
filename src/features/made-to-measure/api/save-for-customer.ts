import 'server-only';

import type { ApiError } from '@/lib/api/errors';
import type { Result } from '@/lib/result';

import type { MeasurementSubmission, SaveOutcome } from '../schemas/profile.schema';
import {
  mintDeviceOwner,
  rememberDevice,
  resolveProfileOwner,
  type ResolvedOwner,
} from './profile-owner';
import { saveProfile } from './profile-server';

/* One save for one owner. A new device's cookie is written only when the save
   SUCCEEDS, so a refused or failed save leaves nothing behind. */
async function saveAs(
  resolved: ResolvedOwner,
  submission: MeasurementSubmission,
): Promise<Result<SaveOutcome, ApiError>> {
  const result = await saveProfile(resolved.owner, submission);
  if (result.ok && resolved.isNewDevice && result.value.kind === 'SAVED') {
    await rememberDevice(resolved.owner);
  }
  return result;
}

/**
 * §34.4 `saveProfile`, for whoever is asking — from the session, or from this
 * device's token (A2-5); never from the request body.
 *
 * A device cookie can name a token the backend no longer knows: lost to a
 * restart, purged, or never issued. Left alone, every save from that browser
 * would fail for good, and clearing cookies is not something a customer knows to
 * do. So, as the bag does with a dead cart id: take a fresh token and retry ONCE.
 * Bounded on purpose — a second refusal is the backend's problem, not the cookie's.
 * Whatever the old token held was unreachable already.
 */
export async function saveForCustomer(
  submission: MeasurementSubmission,
): Promise<Result<SaveOutcome, ApiError>> {
  const resolved = await resolveProfileOwner();
  if (!resolved.ok) return resolved;

  const result = await saveAs(resolved.value, submission);
  const { owner, isNewDevice } = resolved.value;
  const deadToken =
    !result.ok && result.error.kind === 'UNAUTHORIZED' && owner.keptWith === 'DEVICE';
  if (!deadToken || isNewDevice) return result;

  const fresh = await mintDeviceOwner();
  if (!fresh.ok) return fresh;
  return saveAs(fresh.value, submission);
}
