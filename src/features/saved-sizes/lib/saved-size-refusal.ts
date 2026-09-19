import type { Messages } from '@/i18n/messages/en';
import { assertNever } from '@/lib/result';

import type { SavedSizesError } from '../api/saved-sizes-browser';

/** What the customer was doing when a change was refused. */
export type SavedSizeAction = 'REMEMBER' | 'FORGET';

/**
 * Why a change to the saved sizes was refused, in the customer's language.
 *
 * MOD-04 — pure. The parameter is the UNION rather than `string`, so a new kind
 * added to `SavedSizesError` fails the build here instead of falling through to
 * "please try again" — the mistake the address book paid for, where an ENDED
 * session was reported as a passing network problem.
 *
 * `GONE` means different things for the two actions, which is why the action is
 * named: a size the store no longer offers cannot be remembered, and a size that
 * is no longer the current one cannot be forgotten.
 */
export function savedSizeRefusal(
  action: SavedSizeAction,
  kind: SavedSizesError['kind'],
  t: Messages['savedSizes'],
): string {
  switch (kind) {
    case 'SIGNED_OUT':
      return t.signedOut;
    case 'GONE':
      return action === 'REMEMBER' ? t.rememberGone : t.forgetGone;
    case 'UNREACHABLE':
      return action === 'REMEMBER' ? t.rememberUnreachable : t.forgetUnreachable;
    default:
      return assertNever(kind);
  }
}

/**
 * The refusal a failed change carries, recovered from the mutation's error.
 *
 * `unwrap` rejects with the error VALUE, so the union is recovered by narrowing,
 * not a cast (DATA-03a, TS-03); anything else that could have been thrown is not
 * guessed at.
 */
export function savedSizeFailureOf(error: unknown): SavedSizesError['kind'] | null {
  if (error === null || typeof error !== 'object' || !('kind' in error)) return null;
  const { kind } = error;
  return kind === 'SIGNED_OUT' || kind === 'GONE' || kind === 'UNREACHABLE' ? kind : null;
}
