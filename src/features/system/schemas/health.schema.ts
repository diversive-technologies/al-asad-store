import { z } from 'zod';

/**
 * SSOT-09 — one declaration, two outputs: a runtime validator and a static type.
 * A hand-written interface alongside this schema would be a second source of
 * truth and would drift.
 */
export const healthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string().min(1),
});

export type Health = z.infer<typeof healthSchema>;
