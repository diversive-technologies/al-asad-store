import { z } from 'zod';

import { CLIENT } from '@/config/client';

/**
 * FORM-01 / SSOT-09 — one schema for client validation and the inferred type.
 *
 * D3: this is the placeholder sign-in. It deliberately collects a mobile number
 * and NO password: there is no credential to store, and asking for one would
 * train customers on a screen that is going to be replaced.
 *
 * Section 11's real Identity module authenticates by password or by a code sent
 * to a mobile; the mobile field is the part of that shape which survives.
 */
export const signInSchema = z.object({
  /*
   * D5: the national number format is the CLIENT's, not this schema's. A
   * deployment in another market changes one entry in the client profile and
   * both the validation and the placeholder follow, because they read the same
   * source (PD-01).
   */
  mobile: z.string().trim().regex(CLIENT.market.mobile.pattern),
});

export type SignInInput = z.infer<typeof signInSchema>;

/** The mock session the placeholder issues. */
export const sessionSchema = z.object({
  mobile: z.string().min(1),
  displayName: z.string().min(1),
});

export type Session = z.infer<typeof sessionSchema>;
