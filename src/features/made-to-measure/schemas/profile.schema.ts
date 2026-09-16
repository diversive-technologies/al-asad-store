import { z } from 'zod';

import {
  garmentStyleIdSchema,
  measurementPointIdSchema,
  optionGroupIdSchema,
  optionValueIdSchema,
  profileIdSchema,
  ruleIdSchema,
} from '@/lib/domain/ids';

import { UNITS } from '../lib/units';
import { captureSourceSchema } from './measurement-set.schema';

/**
 * §34.4 `validate` and `saveProfile`, as proposed in Amendment 2 (A2-2, A2-5,
 * A2-8). Not yet in the architecture document.
 *
 * The page sends what the customer TYPED — the figure as a string, and the unit
 * it was typed in — and never millimetres: the server derives those from the
 * list version it served (A2-2). The owner is never in the body either; the BFF
 * attaches it from the session or the device's own token.
 */

export const typedPointEntrySchema = z.object({
  pointId: measurementPointIdSchema,
  /* A2-2 — ASCII decimal digits, at most four before the point and two after.
     An Urdu keyboard's digits are normalised before they are sent. */
  raw: z
    .string()
    .trim()
    .regex(/^\d{1,4}(?:\.\d{1,2})?$/),
  unit: z.enum(UNITS),
});

/** A2-8 `preferences` — one finishing choice, as it stood when the figures were sent. */
export const preferenceSchema = z.object({
  group: optionGroupIdSchema,
  value: optionValueIdSchema,
});

/** A2-8 — a finding the customer chose to keep their figure against, by rule. */
export const acknowledgementSchema = z.object({
  ruleId: ruleIdSchema,
  pointId: measurementPointIdSchema,
  direction: z.enum(['ABOVE', 'BELOW']).nullable(),
});

export const measurementSubmissionSchema = z.object({
  garmentStyle: garmentStyleIdSchema,
  /* Which list the figures were typed against — with the style and version, its
     identity. The profile's `source` is the server's, read off that list. */
  source: captureSourceSchema,
  /** The list version the figures were typed against — it must be the current one. */
  version: z.number().int().positive(),
  /* At least one figure, and each point once: a second entry for one point would
     leave the record saying one figure became another's millimetres. */
  entries: z
    .array(typedPointEntrySchema)
    .min(1)
    .max(64)
    .refine((entries) => new Set(entries.map((entry) => entry.pointId)).size === entries.length, {
      error: 'A point is sent twice.',
    }),
  /* Every choice in play, defaults included, so the server asks for exactly the
     points the page asked for — a cuff only with a cuff. */
  preferences: z
    .array(preferenceSchema)
    .max(32)
    .refine((choices) => new Set(choices.map((choice) => choice.group)).size === choices.length, {
      error: 'A choice is sent twice.',
    }),
  /* Each figure the customer chose to keep against a rule that asked about it
     (A2-5). One answer per rule and point: a second would say nothing new, and
     the server counts an answer only against a finding it actually raised. */
  acknowledgedFindings: z
    .array(acknowledgementSchema)
    .max(64)
    .refine(
      (kept) => new Set(kept.map((row) => `${row.ruleId}|${row.pointId}`)).size === kept.length,
      { error: 'A finding is answered twice.' },
    ),
});

export const findingSchema = z
  .object({
    /** Null for a finding about the whole list, such as a version no longer current. */
    pointId: measurementPointIdSchema.nullable(),
    /** The rule that found it, for a rule; null for a range or a missing figure. */
    ruleId: ruleIdSchema.nullable(),
    severity: z.enum(['REFUSED', 'CONFIRM']),
    reason: z.enum([
      'OUT_OF_RANGE',
      'UNREADABLE',
      'REQUIRED',
      'ORDER',
      'DEVIATION',
      'UNKNOWN_POINT',
      'POINT_NOT_ASKED',
      'OPTION_UNKNOWN',
      'OPTION_NOT_APPLICABLE',
      'SET_VERSION_UNKNOWN',
      'SET_VERSION_SUPERSEDED',
    ]),
    relatedPoints: z.array(measurementPointIdSchema),
    direction: z.enum(['ABOVE', 'BELOW']).nullable(),
    expectedMm: z.number().int().positive().nullable(),
  })
  /* A confirmation is answered by keeping a figure against a rule, on a field, so
     one naming neither would stop every check with nothing to press. */
  .refine(
    (found) => found.severity !== 'CONFIRM' || (found.ruleId !== null && found.pointId !== null),
    { error: 'A finding asking for confirmation names no rule or no measurement.' },
  );

export const recordedValueSchema = z.object({
  pointId: measurementPointIdSchema,
  valueMm: z.number().int().positive(),
});

/** A2-5 `validate` — what would be recorded, what stands in the way, and what was kept. */
export const measurementCheckSchema = z.object({
  findings: z.array(findingSchema),
  recorded: z.array(recordedValueSchema),
  /** The answers the server counted — each against a finding it actually raised. */
  acknowledged: z.array(acknowledgementSchema).max(64),
  /** Which rule set judged this, recorded on whatever is saved from it. */
  ruleSetVersion: z.number().int().positive(),
});

/** A2-8 — each value keeps what was typed beside what was recorded. */
export const profileValueSchema = z.object({
  pointId: measurementPointIdSchema,
  enteredValue: z.string().min(1),
  unitEntered: z.enum(UNITS),
  enteredAs: z.enum(['HALF', 'FULL']),
  basis: z.enum(['GARMENT', 'BODY']),
  origin: z.enum(['TYPED', 'TRANSCRIBED']),
  valueMm: z.number().int().positive(),
});

export const measurementProfileSchema = z.object({
  id: profileIdSchema,
  garmentStyle: garmentStyleIdSchema,
  setVersion: z.number().int().positive(),
  /** The rule set this profile passed, so a rule tightened later can tell old from new. */
  ruleSetVersion: z.number().int().positive(),
  /** This owner's nth save for this style. */
  version: z.number().int().positive(),
  /** §34.5 — how the figures were taken, set by the server (TAILOR_CARD in Phase 4). */
  source: captureSourceSchema,
  /** The finishing choices the figures were taken for, as the server settled them. */
  preferences: z.array(preferenceSchema),
  values: z.array(profileValueSchema).min(1),
  acknowledgedFindings: z.array(acknowledgementSchema).max(64),
  /** Kept with an account, or with this browser's device token. */
  keptWith: z.enum(['ACCOUNT', 'DEVICE']),
  createdAt: z.iso.datetime(),
});

/**
 * What a READ of the profiles answers: the CURRENT profile for each style this
 * owner has saved — the one no later save has superseded.
 *
 * Superseded versions are kept (D6) and deliberately NOT served. Nothing reads a
 * previous version back yet, and putting a customer's older figures on the wire
 * for a screen that does not show them is a cost with no reader. They are in the
 * store when something needs them.
 *
 * SEC-02 — a ceiling, because the length of a served list is untrusted input. It
 * is well above the styles the workshop offers.
 */
export const measurementProfilesSchema = z.array(measurementProfileSchema).max(32);

export const saveOutcomeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('SAVED'), profile: measurementProfileSchema }),
  z.object({ kind: z.literal('REJECTED'), findings: z.array(findingSchema).min(1) }),
]);

export const deviceTokenSchema = z.object({ token: z.uuid() });

export type TypedPointEntry = z.infer<typeof typedPointEntrySchema>;
export type Preference = z.infer<typeof preferenceSchema>;
export type Acknowledgement = z.infer<typeof acknowledgementSchema>;
export type MeasurementSubmission = z.infer<typeof measurementSubmissionSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type MeasurementCheck = z.infer<typeof measurementCheckSchema>;
export type MeasurementProfile = z.infer<typeof measurementProfileSchema>;
export type MeasurementProfiles = z.infer<typeof measurementProfilesSchema>;
export type SaveOutcome = z.infer<typeof saveOutcomeSchema>;
