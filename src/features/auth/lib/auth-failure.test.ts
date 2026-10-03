import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import type { ApiError } from '@/lib/api/errors';
import { err, ok } from '@/lib/result';

import { authFailureOf, authRefusal, resetConfirmOutcomeOf, resetOutcomeOf } from './auth-failure';

const network: ApiError = { kind: 'NETWORK', message: 'unreachable' };
const timeout: ApiError = { kind: 'TIMEOUT', message: 'slow' };
const outage: ApiError = { kind: 'SERVER', message: 'down', status: 503 };
const badRequest: ApiError = { kind: 'SERVER', message: 'bad', status: 400 };
const refused: ApiError = { kind: 'UNAUTHORIZED', message: 'no' };
const locked: ApiError = { kind: 'RATE_LIMITED', message: 'wait' };
const invalid: ApiError = { kind: 'VALIDATION', message: 'bad', fieldErrors: {} };

describe('why an authentication step did not go through', () => {
  it.each<[string, ApiError, string]>([
    ['a store that could not be reached', network, 'UNREACHABLE'],
    ['a store that took too long', timeout, 'UNREACHABLE'],
    ['a store that failed on its own side', outage, 'UNREACHABLE'],
    ['a backend refusing the request', badRequest, 'REFUSED'],
    ['a wrong password, unknown email or locked account alike', refused, 'REFUSED'],
    ['too many attempts', locked, 'RATE_LIMITED'],
    ['input our own check refused', invalid, 'INVALID'],
  ])('reads %s', (_label, error, expected) => {
    expect(authFailureOf(error)).toBe(expected);
  });
});

/**
 * TEST-08 — BUG-10: with the store down, sign-in said "Those details did not
 * match" and a code request said "Enter a valid mobile number", sending the
 * customer to correct details that were never wrong.
 */
describe('what the customer is told', () => {
  it.each<[string, ApiError, string, string]>([
    ['a sign-in during an outage', network, en.auth.signInRefused, en.errors.network],
    ['a code request during an outage', outage, en.auth.mobileInvalid, en.errors.network],
    ['a refused sign-in', refused, en.auth.signInRefused, en.auth.signInRefused],
    ['a refused code request', badRequest, en.auth.mobileInvalid, en.auth.mobileInvalid],
    ['a locked-out sign-in', locked, en.auth.signInRefused, en.auth.tooManyAttempts],
  ])('%s', (_label, error, stepRefusal, expected) => {
    expect(authRefusal(error, stepRefusal, en)).toBe(expected);
  });
});

/**
 * TEST-08 — BUG-09: the reset form ignored the action's answer, so an empty box
 * or "abc" was promised a reset link. It still never says whether an account
 * exists: every answer the backend gives reads as sent.
 */
describe('what the password-reset form shows', () => {
  it.each<[string, Parameters<typeof resetOutcomeOf>[0], string]>([
    ['an address that is not an email', err(invalid), 'INVALID'],
    ['a store that could not be reached', err(network), 'UNREACHABLE'],
    ['a request the backend accepted', ok(null), 'SENT'],
    ['a request the backend refused, which says nothing', err(refused), 'SENT'],
  ])('for %s', (_label, result, expected) => {
    expect(resetOutcomeOf(result)).toBe(expected);
  });
});

/**
 * F-03 — redeeming a reset link has an honest answer to give: the backend's 400
 * means THIS link no longer works, and the customer is told to ask for another.
 */
describe('what the reset page shows once it has tried the new password', () => {
  it.each<[string, Parameters<typeof resetConfirmOutcomeOf>[0], string]>([
    ['a password that was changed', ok(null), 'DONE'],
    ['a link the backend refuses with a 400', err(badRequest), 'EXPIRED'],
    ['a link the backend does not know', err({ kind: 'NOT_FOUND', message: 'none' }), 'EXPIRED'],
    ['too many attempts', err(locked), 'RATE_LIMITED'],
    ['a store that could not be reached', err(network), 'UNREACHABLE'],
    ['a store that failed on its own side', err(outage), 'UNREACHABLE'],
    [
      'a reply that broke the contract',
      err({ kind: 'CONTRACT_VIOLATION', message: 'x', issues: [], path: '/p' }),
      'UNREACHABLE',
    ],
    ['a password our own check refused', err(invalid), 'INVALID'],
  ])('for %s', (_label, result, expected) => {
    expect(resetConfirmOutcomeOf(result)).toBe(expected);
  });
});
