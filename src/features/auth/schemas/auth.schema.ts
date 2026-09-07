import { z } from 'zod';

import { CLIENT } from '@/config/client';

/**
 * SSOT-09 / FORM-01 — the wire contract for architecture §11 Identity and
 * Access, and the source of both client validation and the inferred types.
 *
 * §11 exposes TWO ways in, and this file models both because they are not
 * alternatives to each other:
 *
 * ```
 * authenticate(email, password)      -> Session
 * authenticateByCode(mobile, code)   -> Session
 * issueCode(mobile)                  -> void
 * resetPassword(email)               -> void
 * ```
 *
 * **D3 still holds.** This is the placeholder standing in for §11, and it is
 * the SHAPE that matters: when the Java Identity module lands, these schemas
 * describe what it already returns and the forms above them do not change.
 *
 * SEC-01, and it is the reason several things below look pedantic: a password
 * is collected, sent once over the wire, and never stored, echoed, logged or
 * put in a URL. Nothing in this feature writes one anywhere.
 */

/**
 * Password rules, kept deliberately mild.
 *
 * A minimum length and nothing else. Composition rules — an uppercase, a digit,
 * a symbol — are known to push people towards `Password1!` and towards reuse,
 * and §11's real defence is elsewhere: adaptive hashing, rate limiting per
 * identifier and per source, and single-use codes. The frontend's share of that
 * is to not obstruct a long passphrase.
 */
const password = z.string().min(8).max(200);

/** §11 `authenticate(email, password)`. */
export const passwordSignInSchema = z.object({
  email: z.email(),
  password,
});

export type PasswordSignInInput = z.infer<typeof passwordSignInSchema>;

/**
 * §11 `issueCode(mobile)`.
 *
 * D5: the national number format belongs to the CLIENT profile, not to this
 * schema. Another market changes one entry and both the validation and the
 * placeholder follow, because they read the same source (PD-01).
 */
export const codeRequestSchema = z.object({
  mobile: z.string().trim().regex(CLIENT.market.mobile.pattern),
});

export type CodeRequestInput = z.infer<typeof codeRequestSchema>;

/** §11 `authenticateByCode(mobile, code)`. */
export const codeSignInSchema = codeRequestSchema.extend({
  /** Six digits. The backend decides validity; this only rejects a typo early. */
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});

export type CodeSignInInput = z.infer<typeof codeSignInSchema>;

/**
 * Registration.
 *
 * §11 owns accounts but does not spell the registration call, so this is the
 * minimum an account needs to exist and to be contacted: a name to greet them
 * by, an email to authenticate with, a mobile to deliver codes and order
 * updates to, and a password.
 */
export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2).max(80),
    email: z.email(),
    mobile: z.string().trim().regex(CLIENT.market.mobile.pattern),
    password,
    confirmPassword: z.string(),
  })
  /*
   * FORM-04: the mismatch is reported ON the confirm field rather than as a
   * form-level error, so the message appears beside the box that has to change.
   */
  .refine((values) => values.password === values.confirmPassword, {
    error: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

/**
 * What `issueCode` answers with.
 *
 * §11 returns VOID — the code goes by SMS and the caller learns nothing, which
 * is also what stops the endpoint enumerating accounts. `devCode` exists only
 * because no SMS provider is wired up, so without it the code path could not be
 * exercised at all. Optional on purpose: the real backend omits it and the
 * interface must not depend on it.
 */
export const codeIssuedSchema = z.object({
  devCode: z.string().optional(),
});

/** §11 `resetPassword(email)`. */
export const passwordResetSchema = z.object({ email: z.email() });

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

/**
 * The session an authenticated caller holds.
 *
 * Carries no token: §11 owns sessions, and the credential that proves this one
 * stays in an httpOnly cookie the browser cannot read or forge (SEC-01). What
 * reaches the interface is only what it needs to greet someone.
 */
export const sessionSchema = z.object({
  displayName: z.string().min(1),
  email: z.string(),
  mobile: z.string(),
});

export type Session = z.infer<typeof sessionSchema>;
