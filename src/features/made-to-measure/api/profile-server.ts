import 'server-only';

import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { API_HEADERS } from '@/lib/api/headers';
import type { Result } from '@/lib/result';

import {
  deviceTokenSchema,
  measurementCheckSchema,
  saveOutcomeSchema,
  type MeasurementCheck,
  type MeasurementSubmission,
  type SaveOutcome,
} from '../schemas/profile.schema';
import type { ProfileOwner } from './profile-owner';

/** A new guest's device token, minted by the module (as a cart id is by the cart's). */
export function requestDeviceToken(): Promise<Result<{ token: string }, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.madeToMeasure.deviceTokens,
    method: 'POST',
    schema: deviceTokenSchema,
    next: { revalidate: 0 },
  });
}

/**
 * DATA-04 — §34.4 `validate` and `saveProfile`, for the BFF.
 *
 * DATA-09 — caching intent: neither is cacheable. A check answers for these
 * figures against the rules as they stand now, and a save writes.
 */
export function checkMeasurements(
  submission: MeasurementSubmission,
): Promise<Result<MeasurementCheck, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.madeToMeasure.validation,
    method: 'POST',
    body: submission,
    schema: measurementCheckSchema,
    next: { revalidate: 0 },
  });
}

/** Resolves to `SAVED` or `REJECTED` as VALUES: a refusal is the rules working. */
export function saveProfile(
  owner: ProfileOwner,
  submission: MeasurementSubmission,
): Promise<Result<SaveOutcome, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.madeToMeasure.profiles,
    method: 'POST',
    body: submission,
    headers: { [API_HEADERS.measurementOwner]: `${owner.keptWith}:${owner.key}` },
    schema: saveOutcomeSchema,
    next: { revalidate: 0 },
  });
}
