import type { Messages } from '@/i18n/messages/en';
import type { ApiError } from '@/lib/api/errors';
import { assertNever, type Result } from '@/lib/result';

/**
 * Why an authentication step did not go through, in the only terms a customer
 * may be told — MOD-04, React-free.
 *
 * - `UNREACHABLE` — the store could not be reached or could not answer: nothing
 *   about the customer's details is known, so nothing about them may be said.
 * - `RATE_LIMITED` — too many attempts on this identifier; wait.
 * - `INVALID` — our own check refused the input before it was sent.
 * - `REFUSED` — the backend answered no.
 *
 * §11: "authentication responses never reveal whether an account exists", and
 * none of these does. An outage is not an answer about any account, which is why
 * it can — and must — be told apart: an outage used to read "Those details did
 * not match", sending a customer to retype a correct password against a store
 * that was down.
 */
export type AuthFailure = 'UNREACHABLE' | 'RATE_LIMITED' | 'INVALID' | 'REFUSED';

export function authFailureOf(error: ApiError): AuthFailure {
  switch (error.kind) {
    case 'NETWORK':
    case 'TIMEOUT':
    // A body we could not read is no more an answer than no body at all.
    case 'CONTRACT_VIOLATION':
      return 'UNREACHABLE';
    case 'SERVER':
      // A 4xx without a kind of its own is the backend refusing the request.
      return error.status >= 500 ? 'UNREACHABLE' : 'REFUSED';
    case 'RATE_LIMITED':
      return 'RATE_LIMITED';
    case 'VALIDATION':
      return 'INVALID';
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':
    case 'NOT_FOUND':
    case 'CONFLICT':
      return 'REFUSED';
    default:
      // TS-07: a new error kind has to be placed here before it compiles.
      return assertNever(error);
  }
}

/**
 * The sentence for a step that did not go through (ERR-11: our copy, never the
 * upstream text). `refused` is that step's own way of saying no — the same words
 * for a wrong password, an unknown email and a locked account, per §11.
 */
export function authRefusal(error: ApiError, refused: string, messages: Messages): string {
  switch (authFailureOf(error)) {
    case 'UNREACHABLE':
      return messages.errors.network;
    case 'RATE_LIMITED':
      return messages.auth.tooManyAttempts;
    case 'INVALID':
    case 'REFUSED':
      return refused;
  }
}

/**
 * Why a sign-up did not go through. Unlike sign-in, a collision IS reported — §11's
 * enumeration rule is about AUTHENTICATION responses, and someone who cannot finish
 * a sign-up without being told why simply leaves — but a rate limit (F-09) and an
 * outage are said as what they are, never as a failed registration.
 */
export function signUpRefusal(error: ApiError, messages: Messages): string {
  return error.kind === 'CONFLICT'
    ? messages.auth.emailTaken
    : authRefusal(error, messages.auth.signUpFailed, messages);
}

/** What the password-reset form shows once it has asked. */
export type ResetOutcome = 'SENT' | 'INVALID' | 'RATE_LIMITED' | 'UNREACHABLE';

/**
 * §11 `resetPassword` answers nothing about any account, so every answer the
 * backend GAVE reads as "a link is on its way". Two outcomes are not answers and
 * are said as what they are: an address that is not an email (the form used to
 * ignore this and promise a link to it), and a store that could not be reached.
 *
 * F-09 adds a third: Java's limit PER ADDRESS (429) says to wait. It names no
 * account — the limit that depends on the email answers 204 like any other
 * request, so it cannot be used to find out which addresses are known.
 */
export function resetOutcomeOf(result: Result<null, ApiError>): ResetOutcome {
  if (result.ok) return 'SENT';

  const failure = authFailureOf(result.error);
  if (failure === 'INVALID' || failure === 'UNREACHABLE' || failure === 'RATE_LIMITED') {
    return failure;
  }
  return 'SENT';
}

/** What the reset page shows once it has tried to set the new password. */
export type ResetConfirmOutcome = 'DONE' | 'EXPIRED' | 'RATE_LIMITED' | 'UNREACHABLE' | 'INVALID';

/**
 * F-03 — what a redeemed reset link came to.
 *
 * Unlike asking for a link, redeeming one has an honest answer to give: the
 * backend's 400 means THIS link no longer works (unknown, used or past its hour),
 * and saying so sends the customer to ask for another instead of retyping a
 * password at a link that will never take it. The token is 64 hex characters and
 * the password was checked before sending, so no other 4xx is one the customer
 * caused — they all read as the link being no good, which is also the only thing
 * they can do something about.
 */
export function resetConfirmOutcomeOf(result: Result<null, ApiError>): ResetConfirmOutcome {
  if (result.ok) return 'DONE';

  switch (authFailureOf(result.error)) {
    case 'RATE_LIMITED':
      return 'RATE_LIMITED';
    case 'UNREACHABLE':
      return 'UNREACHABLE';
    case 'INVALID':
      return 'INVALID';
    case 'REFUSED':
      return 'EXPIRED';
  }
}
