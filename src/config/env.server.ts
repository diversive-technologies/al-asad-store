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
  /*
   * Architecture 24's TryOnProvider credentials.
   *
   * These configure the MOCK layer, which stands in for Java module 14 under
   * D1 — the storefront itself never calls the provider, and these values never
   * reach the browser (SEC-01, DATA-07). When the Java service arrives they move
   * there and disappear from this file, exactly as API_MOCKING will.
   *
   * OPTIONAL, and that is the design rather than a convenience. Absent means no
   * provider is configured, which the module answers as unavailable — so 28.5's
   * unavailable state is what the store does by DEFAULT, reached honestly
   * rather than simulated, and the app boots and sells with no key present.
   */
  TRY_ON_PROVIDER_API_KEY: z.string().min(1).optional(),
  TRY_ON_PROVIDER_MODEL: z.string().min(1).default('gemini-2.5-flash-image'),
  /*
   * DEMO PLACEHOLDER, and it only applies while NO provider is configured.
   *
   * Enabled, the mock answers a try-on with the garment's own catalogue
   * photograph so the whole flow — pick, wait, look — can be shown before the
   * external service exists. It is a placeholder rather than a generated image
   * and shows the model the piece was shot on, not the customer.
   *
   * Set it to "disabled" to see §28.5's genuine unavailable state instead. Once
   * TRY_ON_PROVIDER_API_KEY is set this value is ignored entirely, and it is
   * deleted along with the mock layer when Java takes over.
   */
  TRY_ON_SAMPLE_RESULT: z.enum(['enabled', 'disabled']).default('enabled'),
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
