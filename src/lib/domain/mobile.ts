/**
 * The ONE form a mobile number travels in: what the customer typed, less the
 * separators they grouped the digits with.
 *
 * `CLIENT.market.mobile.pattern` accepts `0300 1234567` and `0300-1234567` as
 * well as `03001234567`, because that is how people write a number — and the
 * sign-in field's own hint shows the spaced form. Once a customer signs in by
 * code the number IS their identity (§11 `authenticateByCode`), so every spelling
 * the pattern accepts has to name the same account rather than one account each.
 *
 * In the domain layer rather than in `features/auth` because both sides of the
 * wire need it: the contract sends this form (`auth.schema.ts`), and the mock that
 * stands in for Java compares in it, trusting no caller to have done so.
 * Java: a mobile arrives as digits only, with no spaces or dashes.
 */
export function canonicalMobile(value: string): string {
  return value.replace(/[\s-]/g, '');
}
