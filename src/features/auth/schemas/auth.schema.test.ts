import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  codeIssuedSchema,
  codeRequestSchema,
  codeSignInSchema,
  newPasswordSchema,
  passwordResetConfirmSchema,
  passwordResetSchema,
  passwordSignInSchema,
  resetTokenSchema,
  signUpSchema,
} from './auth.schema';

/**
 * Each §11 form passes its own contract before it is sent: a well-formed sign-in,
 * code request, code sign-in, reset or registration is never refused on the
 * storefront's side.
 */
describe('the §11 requests', () => {
  it.each<[string, z.ZodType, unknown]>([
    [
      'a password sign-in',
      passwordSignInSchema,
      { email: 'customer@example.com', password: 'a long passphrase' },
    ],
    ['a code request', codeRequestSchema, { mobile: '03001234567' }],
    ['a code sign-in', codeSignInSchema, { mobile: '03001234567', code: '123456' }],
    ['a password reset', passwordResetSchema, { email: 'customer@example.com' }],
    [
      'a registration whose confirmation matches',
      signUpSchema,
      {
        fullName: 'Test Customer',
        email: 'customer@example.com',
        mobile: '03001234567',
        password: 'a long passphrase',
        confirmPassword: 'a long passphrase',
      },
    ],
  ])('accepts %s', (_label, contract, input) => {
    expect(contract.safeParse(input).success).toBe(true);
  });
});

/*
 * F2 — the number names an account, so it travels in ONE form: digits only. The
 * pattern accepts the spaced and dashed forms people type, and each used to reach
 * the backend as typed and name an account of its own.
 */
describe('a mobile number on the wire', () => {
  it.each(['03001234567', '0300 1234567', '0300-1234567', ' 0300 1234567 '])(
    'is sent as digits only when typed as "%s"',
    (typed) => {
      expect(codeRequestSchema.parse({ mobile: typed }).mobile).toBe('03001234567');
      expect(codeSignInSchema.parse({ mobile: typed, code: '123456' }).mobile).toBe('03001234567');
      expect(
        signUpSchema.parse({
          fullName: 'Test Customer',
          email: 'customer@example.com',
          mobile: typed,
          password: 'a long passphrase',
          confirmPassword: 'a long passphrase',
        }).mobile,
      ).toBe('03001234567');
    },
  );

  it('still refuses a number that is not this market’s', () => {
    expect(codeRequestSchema.safeParse({ mobile: '0300 12 34 567' }).success).toBe(false);
  });
});

/* §11 `issueCode` returns VOID. A backend that answers with nothing at all must
   not break the code sign-in, and the code it shows while demo sign-in codes are
   on stays optional. */
describe('what issueCode may answer', () => {
  it.each([
    ['nothing', null],
    ['an empty object', {}],
    ['the demo sign-in code', { devCode: '123456' }],
  ])('accepts %s', (_label, answer) => {
    expect(codeIssuedSchema.safeParse(answer).success).toBe(true);
  });
});

const TOKEN = 'a1'.repeat(32);

/** F-03 — the token a reset email carries, and the new password chosen with it. */
describe('the password-reset confirmation', () => {
  it('accepts a 64-character hexadecimal token, in either case', () => {
    expect(resetTokenSchema.safeParse(TOKEN).success).toBe(true);
    expect(resetTokenSchema.safeParse(TOKEN.toUpperCase()).success).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['too short', 'abc123'],
    ['one character too long', `${TOKEN}0`],
    ['not hexadecimal', 'g'.repeat(64)],
    ['padded with a space', ` ${TOKEN.slice(1)}`],
    ['absent', undefined],
    ['a repeated query value', [TOKEN, TOKEN]],
  ])('refuses a token that is %s', (_label, token) => {
    expect(resetTokenSchema.safeParse(token).success).toBe(false);
  });

  it('accepts a token with two matching passwords of eight characters or more', () => {
    const input = {
      token: TOKEN,
      password: 'a long passphrase',
      confirmPassword: 'a long passphrase',
    };

    expect(passwordResetConfirmSchema.safeParse(input).success).toBe(true);
    expect(newPasswordSchema.safeParse(input).success).toBe(true);
  });

  it('refuses a password under eight characters, and one over 200', () => {
    for (const password of ['short', 'x'.repeat(201)]) {
      expect(
        passwordResetConfirmSchema.safeParse({ token: TOKEN, password, confirmPassword: password })
          .success,
      ).toBe(false);
    }
  });

  it('reports a mismatch on the confirm box, beside what has to change', () => {
    const result = newPasswordSchema.safeParse({
      password: 'a long passphrase',
      confirmPassword: 'another long passphrase',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['confirmPassword']);
  });

  it('refuses a malformed token inside the action input', () => {
    const input = {
      token: 'nope',
      password: 'a long passphrase',
      confirmPassword: 'a long passphrase',
    };

    expect(passwordResetConfirmSchema.safeParse(input).success).toBe(false);
  });
});
