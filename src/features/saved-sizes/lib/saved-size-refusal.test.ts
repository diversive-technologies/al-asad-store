import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';

import { savedSizeFailureOf, savedSizeRefusal } from './saved-size-refusal';

/**
 * Every way a change to the saved sizes can be refused has its own sentence, and
 * what `GONE` means depends on what the customer was doing: a size no longer
 * offered cannot be remembered, and a size no longer current cannot be forgotten.
 */

describe('savedSizeRefusal', () => {
  const t = en.savedSizes;

  it.each([
    ['REMEMBER', 'SIGNED_OUT', t.signedOut],
    ['FORGET', 'SIGNED_OUT', t.signedOut],
    ['REMEMBER', 'GONE', t.rememberGone],
    ['FORGET', 'GONE', t.forgetGone],
    ['REMEMBER', 'UNREACHABLE', t.rememberUnreachable],
    ['FORGET', 'UNREACHABLE', t.forgetUnreachable],
  ] as const)('puts a %s refused as %s into its own words', (action, kind, words) => {
    expect(savedSizeRefusal(action, kind, t)).toBe(words);
  });
});

describe('savedSizeFailureOf', () => {
  it.each([
    ['a refusal the reader answered', { kind: 'GONE' }, 'GONE'],
    ['a kind nobody declared', { kind: 'SOMETHING' }, null],
    ['an error thrown by something else', new Error('boom'), null],
    ['no error at all', null, null],
  ])('recovers %s', (_label, error, expected) => {
    expect(savedSizeFailureOf(error)).toBe(expected);
  });
});
