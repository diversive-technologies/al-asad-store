import { z } from 'zod';

import { parseMediaHost } from '@/lib/media/media-host';

/**
 * SSOT-03 — THE client environment source. Safe to bundle.
 * SEC-01: every value here is world-readable; treat it as published.
 */
const clientSchema = z.object({
  // Referenced statically so the bundler can inline the value.
  NEXT_PUBLIC_APP_URL: z.url(),
  /*
   * R-03 — the CDN host product media is served from: a bare host, no scheme.
   * OPTIONAL: unset (local development, tests), the fixture images in `public/`
   * are used and no media origin is added to the Content-Security-Policy.
   */
  NEXT_PUBLIC_MEDIA_HOST: z
    .string()
    .refine((value) => parseMediaHost(value) !== null, {
      error: 'a bare host, for example media.example.com',
    })
    .optional(),
});

const parsed = clientSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  // An empty string is how a blank line in a dashboard arrives; it means unset.
  NEXT_PUBLIC_MEDIA_HOST: process.env.NEXT_PUBLIC_MEDIA_HOST || undefined,
});

if (!parsed.success) {
  // ERR-06: boot-time configuration invariant, not flow control.
  throw new Error(
    `Invalid client environment: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
  );
}

export const clientEnv = parsed.data;
