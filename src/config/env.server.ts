import 'server-only';

import { z } from 'zod';

/**
 * SSOT-03 — THE server environment source. Never reaches the browser.
 * Reading `process.env` anywhere else is PROHIBITED.
 */
const serverSchema = z.object({
  JAVA_API_BASE_URL: z.url(),
  JAVA_API_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  /*
   * Architecture 24's TryOnProvider credentials, read by `features/try-on`,
   * which calls the image model from this server. They never reach the browser
   * (SEC-01, DATA-07).
   *
   * OPTIONAL, and that is the design rather than a convenience. Absent means no
   * provider is configured, which the module answers as unavailable — so 28.5's
   * unavailable state is what the store does by DEFAULT, reached honestly
   * rather than simulated, and the app boots and sells with no key present.
   */
  TRY_ON_PROVIDER_API_KEY: z.string().min(1).optional(),
  /*
   * gemini-2.5-flash-image, the previous default, is shut down by Google on
   * 2026-10-02. 3.1 Flash Image is its GA successor and takes the same request.
   */
  TRY_ON_PROVIDER_MODEL: z.string().min(1).default('gemini-3.1-flash-image'),
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
