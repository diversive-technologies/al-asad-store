'use server';

import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { err, type Result } from '@/lib/result';

import {
  newsletterSubscribeSchema,
  newsletterSubscriptionSchema,
  type NewsletterSubscription,
} from './schemas/newsletter.schema';

/**
 * NEXT-12 — a Server Action is a public, unauthenticated endpoint. Its input is
 * validated with Zod before anything else happens, and its outcome is returned
 * as a Result rather than thrown.
 *
 * No authorization check applies: subscribing to a mailing list is open to
 * anyone, signed in or not.
 */
export async function subscribeToNewsletterAction(
  input: unknown,
): Promise<Result<NewsletterSubscription, ApiError>> {
  // SEC-02: untrusted input, validated at the boundary and never cast.
  const parsed = newsletterSubscribeSchema.safeParse(input);

  if (!parsed.success) {
    return err({
      kind: 'VALIDATION',
      message: 'The submitted data was rejected.',
      // FORM-04: shaped so the client can map errors back onto fields.
      fieldErrors: { email: ['invalid'] },
    });
  }

  return apiRequest({
    path: ENDPOINTS.newsletter.subscribe,
    schema: newsletterSubscriptionSchema,
    method: 'POST',
    body: parsed.data,
    // DATA-09: a write, so there is nothing to cache.
    next: { revalidate: 0 },
  });
}
