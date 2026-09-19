import type { z } from 'zod';

import { ROUTES } from '@/config/routes';
import { fetchWithContract } from '@/lib/api/browser-fetch';
import { err, ok, type Result } from '@/lib/result';

import type {
  MeasurementCheck,
  MeasurementSubmission,
  SaveOutcome,
} from '../schemas/profile.schema';

/*
 * Deliberate code split (IMP-01a, PERF-10): a static import of these schemas
 * made Zod first-load JavaScript on the studio, for requests made only when a
 * customer checks or saves. They arrive with the request instead
 * (`fetchWithContract` has the reasoning).
 */
const loadSchemas = () => import('../schemas/profile.schema');

type ProfileSchemas = Awaited<ReturnType<typeof loadSchemas>>;

/**
 * The browser side of §34.4: our own BFF, never Java directly. No owner crosses
 * this boundary — the BFF attaches it from the session or the device cookie.
 */

export interface ProfileRequestError {
  readonly kind: 'UNAVAILABLE';
}

const FAILED: Result<never, ProfileRequestError> = err({ kind: 'UNAVAILABLE' });

/**
 * ERR-05(1) / ERR-01 — one place where a rejected `fetch` becomes a value. The
 * schema is named by a selector because the schemas arrive with the request.
 */
async function post<TSchema extends z.ZodType>(
  url: string,
  schemaOf: (schemas: ProfileSchemas) => TSchema,
  body: unknown,
): Promise<Result<z.infer<TSchema>, ProfileRequestError>> {
  const [response, schemas] = await fetchWithContract(
    url,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    loadSchemas,
  );

  if (response === null || !response.ok || schemas === null) return FAILED;

  const payload: unknown = await response.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  // DATA-02: our own route is a network boundary like any other.
  const parsed = schemaOf(schemas).safeParse(payload);
  return parsed.success ? ok(parsed.data) : FAILED;
}

/** §34.4 `validate` — findings, and the millimetres each figure would record as. */
export function requestCheck(
  submission: MeasurementSubmission,
): Promise<Result<MeasurementCheck, ProfileRequestError>> {
  return post(ROUTES.api.measurementCheck, (schemas) => schemas.measurementCheckSchema, submission);
}

/** §34.4 `saveProfile` — `SAVED` or `REJECTED`, both as values. */
export function requestSave(
  submission: MeasurementSubmission,
): Promise<Result<SaveOutcome, ProfileRequestError>> {
  return post(ROUTES.api.measurementProfiles, (schemas) => schemas.saveOutcomeSchema, submission);
}
