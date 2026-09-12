import { z } from 'zod';

import { SOURCE_ROWS } from './measurement-sets-db';
import type { SubmissionRow } from './profiles-db';

/**
 * D1 — the BODY module 18 was sent, read as `unknown` and checked before anything
 * touches it (SEC-02), standing in for Java's boundary. The store is
 * `profiles-db.ts`; this is only the door.
 *
 * The mock cannot import the feature's own schema (MOD-01), so it states the wire
 * shape for itself. Every change to the contract is therefore made twice, and
 * `profile.schema.test.ts` runs the mock's answers through the page's schema so
 * the two cannot drift apart unnoticed.
 */

const submissionRowSchema = z.object({
  garmentStyle: z.string(),
  source: z.enum(SOURCE_ROWS),
  version: z.number(),
  entries: z.array(z.object({ pointId: z.string(), raw: z.string(), unit: z.enum(['IN', 'CM']) })),
  preferences: z.array(z.object({ group: z.string(), value: z.string() })),
  acknowledgedFindings: z.array(
    z.object({
      ruleId: z.string(),
      pointId: z.string(),
      direction: z.enum(['ABOVE', 'BELOW']).nullable(),
    }),
  ),
});

/**
 * The body the stand-in was sent, if it is shaped like a submission at all. Java's
 * boundary refuses anything else with a 400, and so does this — rather than
 * throwing on a missing array.
 */
export function readSubmission(body: unknown): SubmissionRow | null {
  const parsed = submissionRowSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

/**
 * What Java's boundary would refuse as malformed rather than answer: a point, a
 * choice, or an answer to one finding sent twice. Each would leave the record
 * saying two things about one thing.
 */
export function isMalformed(submission: SubmissionRow): boolean {
  const points = submission.entries.map((entry) => entry.pointId);
  const choices = submission.preferences.map((preference) => preference.group);
  const kept = submission.acknowledgedFindings.map((row) => `${row.ruleId}|${row.pointId}`);
  return (
    new Set(points).size !== points.length ||
    new Set(choices).size !== choices.length ||
    new Set(kept).size !== kept.length
  );
}
