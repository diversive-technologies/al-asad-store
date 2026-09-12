import { z } from 'zod';

/**
 * §22 Localisation — the studio's wording, keyed by id.
 *
 * §34.3: module 18 does NOT own its instruction copy, so the measurement list
 * carries ids and this read carries the words, in the reader's language. One read
 * per locale covers every style: a point means the same thing, and is measured
 * the same way, whichever style it appears in — and a finishing choice too.
 *
 * Every string is required to be non-empty. With the wording served rather than
 * typed into a message file, the compiler can no longer prove that each point has
 * a label — so `joinCopy` checks it when the list and the wording meet, and a
 * test parses every style in every language.
 */
export const pointCopySchema = z.object({
  label: z.string().min(1),
  instruction: z.string().min(1),
});

/** A finishing choice's name, and each of its values', by value id. */
export const optionCopySchema = z.object({
  label: z.string().min(1),
  values: z.record(z.string(), z.string().min(1)),
});

export const measurementCopySchema = z.object({
  styles: z.record(z.string(), z.string().min(1)),
  pieces: z.record(z.string(), z.string().min(1)),
  points: z.record(z.string(), pointCopySchema),
  options: z.record(z.string(), optionCopySchema),
});

export type PointCopy = z.infer<typeof pointCopySchema>;
export type OptionCopy = z.infer<typeof optionCopySchema>;
export type MeasurementCopy = z.infer<typeof measurementCopySchema>;
