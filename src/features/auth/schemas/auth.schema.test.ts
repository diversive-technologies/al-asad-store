import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  authenticateBody,
  codeSignInBody,
  issueCodeBody,
  registerBody,
  resetBody,
} from '@/lib/mocks/request-bodies';

import {
  codeIssuedSchema,
  codeRequestSchema,
  codeSignInSchema,
  passwordResetSchema,
  passwordSignInSchema,
  signUpSchema,
} from './auth.schema';

/**
 * The mock that stands in for §11 states each request's wire shape for itself
 * (MOD-01), so this holds the two together: what a sign-in form sends must be a
 * body the mock accepts.
 */
describe('the §11 requests and the bodies the mock backend reads', () => {
  it.each<[string, z.ZodType, z.ZodType, unknown]>([
    [
      'a password sign-in',
      passwordSignInSchema,
      authenticateBody,
      { email: 'customer@example.com', password: 'a long passphrase' },
    ],
    ['a code request', codeRequestSchema, issueCodeBody, { mobile: '03001234567' }],
    ['a code sign-in', codeSignInSchema, codeSignInBody, { mobile: '03001234567', code: '123456' }],
    ['a password reset', passwordResetSchema, resetBody, { email: 'customer@example.com' }],
  ])('%s passes both', (_label, contract, mock, input) => {
    const sent = contract.safeParse(input);

    expect(sent.success).toBe(true);
    expect(mock.safeParse(sent.data).success).toBe(true);
  });

  it('a registration, without its confirmation, passes both', () => {
    // `signUpAction` sends the parsed form minus its confirmation, and so does this.
    const { confirmPassword: _confirmation, ...account } = signUpSchema.parse({
      fullName: 'Test Customer',
      email: 'customer@example.com',
      mobile: '03001234567',
      password: 'a long passphrase',
      confirmPassword: 'a long passphrase',
    });
    void _confirmation;

    expect(registerBody.safeParse(account).success).toBe(true);
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
   not break the code sign-in, and the mock's development code stays optional. */
describe('what issueCode may answer', () => {
  it.each([
    ['nothing', null],
    ['an empty object', {}],
    ["the mock's development code", { devCode: '123456' }],
  ])('accepts %s', (_label, answer) => {
    expect(codeIssuedSchema.safeParse(answer).success).toBe(true);
  });
});
