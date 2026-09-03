import 'server-only';

import { z } from 'zod';

/**
 * SSOT-03 — THE server environment source. Never reaches the browser.
 * Reading `process.env` anywhere else is PROHIBITED.
 */
const serverSchema = z.object({
  JAVA_API_BASE_URL: z.url(),
  JAVA_API_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  /** D1: MSW intercepts outbound backend calls while the Java service is unbuilt. */
  API_MOCKING: z.enum(['enabled', 'disabled']).default('disabled'),
  NODE_ENV: z.enum(['development', 'test', 'production']),
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  // ERR-06: boot-time configuration invariant, not flow control.
  throw new Error(
    `Invalid server environment: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
  );
}

export const serverEnv = parsed.data;
