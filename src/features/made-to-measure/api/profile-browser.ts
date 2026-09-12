import type { z } from 'zod';

import { ROUTES } from '@/config/routes';
import { err, ok, type Result } from '@/lib/result';

import {
  measurementCheckSchema,
  saveOutcomeSchema,
  type MeasurementCheck,
  type MeasurementSubmission,
  type SaveOutcome,
} from '../schemas/profile.schema';

/**
 * The browser side of §34.4: our own BFF, never Java directly. No owner crosses
 * this boundary — the BFF attaches it from the session or the device cookie.
 */

export interface ProfileRequestError {
  readonly kind: 'UNAVAILABLE';
}

const FAILED: Result<never, ProfileRequestError> = err({ kind: 'UNAVAILABLE' });

/** ERR-05(1) / ERR-01 — one place where a rejected `fetch` becomes a value. */
async function post<TSchema extends z.ZodType>(
  url: string,
  schema: TSchema,
  body: unknown,
): Promise<Result<z.infer<TSchema>, ProfileRequestError>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then<Response | null, null>(
    (result) => result,
    () => null,
  );

  if (response === null || !response.ok) return FAILED;

  const payload: unknown = await response.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  // DATA-02: our own route is a network boundary like any other.
  const parsed = schema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : FAILED;
}

/** §34.4 `validate` — findings, and the millimetres each figure would record as. */
export function requestCheck(
  submission: MeasurementSubmission,
): Promise<Result<MeasurementCheck, ProfileRequestError>> {
  return post(ROUTES.api.measurementCheck, measurementCheckSchema, submission);
}

/** §34.4 `saveProfile` — `SAVED` or `REJECTED`, both as values. */
export function requestSave(
  submission: MeasurementSubmission,
): Promise<Result<SaveOutcome, ProfileRequestError>> {
  return post(ROUTES.api.measurementProfiles, saveOutcomeSchema, submission);
}
