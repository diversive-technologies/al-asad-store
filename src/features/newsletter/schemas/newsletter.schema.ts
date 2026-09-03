import { z } from 'zod';

/**
 * FORM-01 / SSOT-09 — one schema, used for client validation and for the
 * inferred type. FORM-03: this is a UX affordance only; the Java service
 * remains authoritative and validates again.
 */
export const newsletterSubscribeSchema = z.object({
  email: z.email(),
});

export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;

/** What the backend returns on a successful subscription. */
export const newsletterSubscriptionSchema = z.object({
  email: z.email(),
  status: z.enum(['SUBSCRIBED', 'ALREADY_SUBSCRIBED']),
});

export type NewsletterSubscription = z.infer<typeof newsletterSubscriptionSchema>;
