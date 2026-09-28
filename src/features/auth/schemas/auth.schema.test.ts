import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  codeIssuedSchema,
  codeRequestSchema,
  codeSignInSchema,
  passwordResetSchema,
  passwordSignInSchema,
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
