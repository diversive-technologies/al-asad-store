/**
 * MOD-04 — pure, React-free. Decides only whether a code lookup is worth
 * attempting; it never decides whether something IS a code.
 *
 * That distinction is the whole design. What a product code looks like is the
 * backend's rule (DATA-13), and a regex here would be a second copy of it that
 * silently rots the day the operator adds a new code prefix. So this encodes one
 * property of tokens rather than of codes: a product code is a single token, and
 * anything containing whitespace is a phrase. `byCode` answers for everything
 * that gets past that, and a miss is an ordinary `null`.
 *
 * Being wrong is cheap in one direction and expensive in the other. A term that
 * is not a code costs one cached backend call that returns nothing; a code we
 * declined to look up costs the customer their shortcut.
 */

/** Longer than any plausible single-token code; guards against pasted junk. */
const MAX_CODE_LENGTH = 32;

export function shouldAttemptCodeLookup(term: string): boolean {
  const trimmed = term.trim();

  if (trimmed.length === 0) return false;
  if (trimmed.length > MAX_CODE_LENGTH) return false;

  // `\s` covers the non-breaking and ideographic spaces a paste can carry.
  return !/\s/u.test(trimmed);
}
