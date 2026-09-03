import { z } from 'zod';

/**
 * SSOT-03 — THE client environment source. Safe to bundle.
 * SEC-01: every value here is world-readable; treat it as published.
 */
const clientSchema = z.object({
  // Referenced statically so the bundler can inline the value.
  NEXT_PUBLIC_APP_URL: z.url(),
});

const parsed = clientSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!parsed.success) {
  // ERR-06: boot-time configuration invariant, not flow control.
  throw new Error('Invalid client environment: NEXT_PUBLIC_APP_URL');
}

export const clientEnv = parsed.data;
