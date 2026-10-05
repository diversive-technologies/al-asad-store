import 'server-only';

import { z } from 'zod';

/**
 * SSOT-03 — THE server environment source. Never reaches the browser.
 * Reading `process.env` anywhere else is PROHIBITED.
 */
const serverSchema = z
  .object({
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
    /*
     * F-01 — signs the session cookie (HMAC-SHA256). REQUIRED: with no secret the
     * store cannot tell a customer's cookie from one somebody wrote by hand, so
     * the app refuses to boot rather than run with forgeable sessions (ERR-06).
     * `SESSION_SECRET_PREVIOUS` is set only while the secret is being rotated.
     */
    SESSION_SECRET: z.string().min(32),
    SESSION_SECRET_PREVIOUS: z.string().min(32).optional(),
    /*
     * F-02 — the Cloudflare Access service token this server presents to Java
     * (TD-1). Optional so local development, which talks to a backend on
     * localhost with no Access in front of it, needs neither; the refinement below
     * makes both mandatory wherever Vercel says this is a hosted environment.
     */
    CF_ACCESS_CLIENT_ID: z.string().min(1).optional(),
    CF_ACCESS_CLIENT_SECRET: z.string().min(1).optional(),
    /*
     * F-08 — the Sentry project's DSN for server-side error tracking (TD-11).
     * OPTIONAL: unset, nothing is sent and nothing else changes, so local
     * development, tests and a deployment not yet given a project all run as before.
     * A DSN is not a secret in Sentry's model, but it stays server-side — no Sentry
     * code ships to the browser.
     */
    SENTRY_DSN: z.url().optional(),
    /*
     * F-06 - the secret the Java worker presents to `POST /api/revalidate`.
     * OPTIONAL: unset, the route answers 401 to everyone (closed), so local
     * development and tests need none. At least 32 characters when set.
     */
    REVALIDATE_SECRET: z.string().min(32).optional(),
    /** Set by Vercel; absent on a developer's machine and in tests. */
    VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']),
  })
  .refine(
    (env) =>
      env.VERCEL_ENV === undefined ||
      env.VERCEL_ENV === 'development' ||
      (env.CF_ACCESS_CLIENT_ID !== undefined && env.CF_ACCESS_CLIENT_SECRET !== undefined),
    {
      error:
        'CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET are required when VERCEL_ENV is preview or production',
      path: ['CF_ACCESS_CLIENT_ID'],
    },
  );

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  // ERR-06: boot-time configuration invariant, not flow control.
  throw new Error(
    `Invalid server environment: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
  );
}

export const serverEnv = parsed.data;
