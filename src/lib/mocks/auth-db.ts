/**
 * D1 — architecture §11 Identity and Access, standing in for the Java module.
 *
 * §11's invariants are the whole reason this is modelled rather than stubbed.
 * A mock that says "yes" to everything would leave the interface's handling of
 * each of these untested, and three of them are visible to a customer:
 *
 * - "Sign-in codes are single-use and expire."
 * - "Failed attempts are rate-limited per identifier and per source."
 * - "Authentication responses never reveal whether an account exists."
 *
 * That last one shapes every failure below: a wrong password, an unknown email
 * and a locked account all return the SAME refusal. Distinguishing them turns
 * the sign-in form into an account-enumeration oracle.
 *
 * SEC-01: no password is logged, echoed back, or put in a URL. SEC-10: the
 * fixture credential below is obviously fake and exists only in this mock
 * layer, which is not bundled once `API_MOCKING` is off.
 */

/** §11 "sign-in codes … expire". */
const CODE_TTL_MS = 5 * 60 * 1000;
/** §11 "failed attempts are rate-limited per identifier". */
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

interface Account {
  displayName: string;
  email: string;
  mobile: string;
  /**
   * Plaintext, and ONLY because this is the mock.
   *
   * §11 requires "a modern adaptive function, never reversible", which is the
   * Java module's job — hashing here would imitate the shape without providing
   * any of the property, and would suggest this file is a security boundary. It
   * is not. The value is a throwaway used to sign into a demo.
   */
  password: string;
}

/**
 * The seeded test account. Not a secret, not real, and not reachable in
 * production: this module is only loaded when the mock layer is armed.
 */
const TEST_ACCOUNT: Account = {
  displayName: 'Test Customer',
  email: 'customer@example.com',
  mobile: '03001234567',
  password: 'password1234',
};

const ACCOUNTS = new Map<string, Account>([[TEST_ACCOUNT.email, TEST_ACCOUNT]]);

interface IssuedCode {
  code: string;
  expiresAt: number;
  /** §11: "single-use". Spent codes stay recorded so a replay is refused. */
  isSpent: boolean;
}

const CODES = new Map<string, IssuedCode>();
const FAILURES = new Map<string, { count: number; lockedUntil: number }>();

export interface SessionPayload {
  displayName: string;
  email: string;
  mobile: string;
}

export type AuthOutcome =
  | { kind: 'AUTHENTICATED'; session: SessionPayload }
  /** Deliberately undifferentiated — see the note at the top of this file. */
  | { kind: 'REJECTED' }
  | { kind: 'RATE_LIMITED' };

function isLocked(identifier: string, now: number): boolean {
  const record = FAILURES.get(identifier);
  return record !== undefined && record.lockedUntil > now;
}

function recordFailure(identifier: string, now: number): void {
  const record = FAILURES.get(identifier) ?? { count: 0, lockedUntil: 0 };
  const count = record.count + 1;

  FAILURES.set(identifier, {
    count,
    lockedUntil: count >= MAX_FAILURES ? now + LOCKOUT_MS : 0,
  });
}

function sessionFor(account: Account): SessionPayload {
  return { displayName: account.displayName, email: account.email, mobile: account.mobile };
}

/** §11 `authenticate(email, password) -> Session`. */
export function authenticate(email: string, password: string): AuthOutcome {
  const now = Date.now();
  const identifier = email.trim().toLowerCase();

  if (isLocked(identifier, now)) return { kind: 'RATE_LIMITED' };

  const account = ACCOUNTS.get(identifier);

  /*
   * One branch, one answer. An unknown email and a wrong password are the same
   * `REJECTED` — and the failure is recorded either way, so probing for which
   * addresses exist costs the prober their attempts too.
   */
  if (account === undefined || account.password !== password) {
    recordFailure(identifier, now);
    return { kind: 'REJECTED' };
  }

  FAILURES.delete(identifier);
  return { kind: 'AUTHENTICATED', session: sessionFor(account) };
}

/**
 * §11 `issueCode(mobile) -> void`.
 *
 * Returns nothing about whether the mobile is known, for the same reason
 * `authenticate` does not: the response would otherwise enumerate accounts.
 * The code is returned here ONLY because there is no SMS provider — see the
 * handler, which decides whether to surface it.
 */
export function issueCode(mobile: string): string {
  const code = String(Math.floor(100_000 + Math.random() * 900_000));
  CODES.set(mobile.trim(), { code, expiresAt: Date.now() + CODE_TTL_MS, isSpent: false });
  return code;
}

/** §11 `authenticateByCode(mobile, code) -> Session`. */
export function authenticateByCode(mobile: string, code: string): AuthOutcome {
  const now = Date.now();
  const identifier = mobile.trim();

  if (isLocked(identifier, now)) return { kind: 'RATE_LIMITED' };

  const issued = CODES.get(identifier);
  const isUsable =
    issued !== undefined && !issued.isSpent && issued.expiresAt > now && issued.code === code.trim();

  if (!isUsable) {
    recordFailure(identifier, now);
    return { kind: 'REJECTED' };
  }

  // §11: single-use. Spending it here means a replay of the same code fails.
  CODES.set(identifier, { ...issued, isSpent: true });
  FAILURES.delete(identifier);

  const account = [...ACCOUNTS.values()].find((entry) => entry.mobile === identifier);

  /*
   * A code proves possession of the number, so an unknown mobile signs in as a
   * new customer rather than being refused. That matches how this storefront
   * actually works: §28.2 already lets a guest buy, and the number IS the
   * identity in this market.
   */
  return {
    kind: 'AUTHENTICATED',
    session: account === undefined
      ? { displayName: 'Customer', email: '', mobile: identifier }
      : sessionFor(account),
  };
}

export type RegisterOutcome =
  | { kind: 'REGISTERED'; session: SessionPayload }
  | { kind: 'TAKEN' };

/** Create an account. Not in §11's exposed list, but §11 owns accounts. */
export function register(input: {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
}): RegisterOutcome {
  const email = input.email.trim().toLowerCase();

  /*
   * Registration DOES report a collision, unlike authentication, and the
   * difference is deliberate: someone who cannot complete a sign-up without
   * being told why will simply leave, and the address they typed is one they
   * already control in the overwhelming majority of cases. §11's enumeration
   * rule is about AUTHENTICATION responses.
   */
  if (ACCOUNTS.has(email)) return { kind: 'TAKEN' };

  const account: Account = {
    displayName: input.fullName.trim(),
    email,
    mobile: input.mobile.trim(),
    password: input.password,
  };

  ACCOUNTS.set(email, account);
  return { kind: 'REGISTERED', session: sessionFor(account) };
}

/**
 * §11 `resetPassword(email) -> void`.
 *
 * Void on purpose. The caller learns nothing, and the interface says "if that
 * address has an account, a link is on its way" whatever happened.
 */
export function requestPasswordReset(email: string): void {
  /*
   * No mail provider is wired up, so there is nothing to enqueue. The SHAPE is
   * what matters and is what the interface is built against: a void call whose
   * answer is identical whether or not the address has an account.
   */
  void email;
}

/** Test seam. */
export function resetAuth(): void {
  CODES.clear();
  FAILURES.clear();
  ACCOUNTS.clear();
  ACCOUNTS.set(TEST_ACCOUNT.email, { ...TEST_ACCOUNT });
}

/** The seeded credentials, for the sign-in screen's own test-account hint. */
export const TEST_CREDENTIALS = {
  email: TEST_ACCOUNT.email,
  password: TEST_ACCOUNT.password,
  mobile: TEST_ACCOUNT.mobile,
} as const;
