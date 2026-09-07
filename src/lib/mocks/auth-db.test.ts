import { beforeEach, describe, expect, it } from 'vitest';

import {
  authenticate,
  authenticateByCode,
  issueCode,
  register,
  resetAuth,
  TEST_CREDENTIALS,
} from './auth-db';

/**
 * Architecture §11's invariants. Each of these is a rule that fails SILENTLY
 * when it is wrong — an enumeration oracle looks like a helpful error message,
 * and a reusable code looks like a working sign-in — so they are pinned rather
 * than trusted to a reading of the code.
 */

beforeEach(() => {
  resetAuth();
});

describe('§11 authenticate', () => {
  it('accepts the seeded account', () => {
    const outcome = authenticate(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
    expect(outcome.kind).toBe('AUTHENTICATED');
  });

  it('answers identically for a wrong password and an unknown account', () => {
    /*
     * §11: "Authentication responses never reveal whether an account exists."
     * These two must be indistinguishable to the caller — if they ever diverge,
     * the sign-in form becomes a way to discover who has an account.
     */
    const wrongPassword = authenticate(TEST_CREDENTIALS.email, 'not-the-password');
    const noSuchAccount = authenticate('nobody@example.com', 'not-the-password');

    expect(wrongPassword).toEqual(noSuchAccount);
    expect(wrongPassword.kind).toBe('REJECTED');
  });

  it('rate-limits repeated failures per identifier', () => {
    // §11: "Failed attempts are rate-limited per identifier and per source."
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(authenticate(TEST_CREDENTIALS.email, 'wrong').kind).toBe('REJECTED');
    }

    expect(authenticate(TEST_CREDENTIALS.email, 'wrong').kind).toBe('RATE_LIMITED');

    // Locked out even WITH the right password: the limit is on the identifier,
    // not on whether this particular attempt would have succeeded.
    expect(authenticate(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password).kind).toBe(
      'RATE_LIMITED',
    );
  });

  it('does not lock a different identifier', () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      authenticate('someone@example.com', 'wrong');
    }

    expect(authenticate(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password).kind).toBe(
      'AUTHENTICATED',
    );
  });
});

describe('§11 authenticateByCode', () => {
  it('accepts a freshly issued code', () => {
    const code = issueCode(TEST_CREDENTIALS.mobile);
    const outcome = authenticateByCode(TEST_CREDENTIALS.mobile, code);

    expect(outcome.kind).toBe('AUTHENTICATED');
    if (outcome.kind !== 'AUTHENTICATED') throw new Error('unreachable');
    expect(outcome.session.displayName).toBe('Test Customer');
  });

  it('refuses the same code twice', () => {
    // §11: "Sign-in codes are single-use and expire."
    const code = issueCode(TEST_CREDENTIALS.mobile);

    expect(authenticateByCode(TEST_CREDENTIALS.mobile, code).kind).toBe('AUTHENTICATED');
    expect(authenticateByCode(TEST_CREDENTIALS.mobile, code).kind).toBe('REJECTED');
  });

  it('refuses a code issued for a different number', () => {
    const code = issueCode(TEST_CREDENTIALS.mobile);
    expect(authenticateByCode('03009999999', code).kind).toBe('REJECTED');
  });

  it('signs in an unknown number as a new customer', () => {
    /*
     * A code proves possession of the number, and in this market the number IS
     * the identity — §28.2 already lets a guest buy without an account at all.
     */
    const mobile = '03211234567';
    const outcome = authenticateByCode(mobile, issueCode(mobile));

    expect(outcome.kind).toBe('AUTHENTICATED');
    if (outcome.kind !== 'AUTHENTICATED') throw new Error('unreachable');
    expect(outcome.session.mobile).toBe(mobile);
  });
});

describe('registration', () => {
  it('creates an account that can then sign in', () => {
    const created = register({
      fullName: 'New Customer',
      email: 'new@example.com',
      mobile: '03007654321',
      password: 'a-long-enough-password',
    });

    expect(created.kind).toBe('REGISTERED');
    expect(authenticate('new@example.com', 'a-long-enough-password').kind).toBe('AUTHENTICATED');
  });

  it('reports a collision, unlike authentication', () => {
    /*
     * The asymmetry is deliberate. §11's enumeration rule governs AUTHENTICATION
     * responses; a sign-up that refused without saying why would simply lose the
     * customer, and the address is one they almost always control.
     */
    const outcome = register({
      fullName: 'Someone Else',
      email: TEST_CREDENTIALS.email,
      mobile: '03007654321',
      password: 'a-long-enough-password',
    });

    expect(outcome.kind).toBe('TAKEN');
  });

  it('normalises the email so case cannot create a second account', () => {
    register({
      fullName: 'New Customer',
      email: 'Mixed.Case@Example.com',
      mobile: '03007654321',
      password: 'a-long-enough-password',
    });

    expect(authenticate('mixed.case@example.com', 'a-long-enough-password').kind).toBe(
      'AUTHENTICATED',
    );
  });
});
