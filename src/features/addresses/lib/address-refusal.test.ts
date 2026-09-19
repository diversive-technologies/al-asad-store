import { describe, expect, it } from 'vitest';

import { en, type Messages } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';

import type { AddressBookError } from '../api/addresses-browser';
import { addressFailureOf, addressRefusal } from './address-refusal';

type RefusalKind = AddressBookError['kind'];

/*
 * Every kind the book can refuse with, and the sentence it must be put in. Keyed
 * by the UNION, so a kind added to `AddressBookError` fails to compile here until
 * someone decides what the customer is told about it.
 */
const SENTENCE_FOR = {
  UNREACHABLE: 'addressesUnavailable',
  SIGNED_OUT: 'addressesSignedOut',
  FULL: 'addressesFull',
  GONE: 'addressGone',
} as const satisfies Record<RefusalKind, keyof Messages['account']>;

const KINDS = Object.keys(SENTENCE_FOR) as RefusalKind[];

describe('what the customer is told when a change to the book is refused', () => {
  it.each(
    KINDS.flatMap(
      (kind) =>
        [
          ['en', kind, en],
          ['ur', kind, ur],
        ] as const,
    ),
  )('in %s, %s has its own sentence', (_locale, kind, messages) => {
    expect(addressRefusal(kind, messages.account)).toBe(messages.account[SENTENCE_FOR[kind]]);
  });

  it('never puts two different refusals in the same words', () => {
    const sentences = KINDS.map((kind) => addressRefusal(kind, en.account));

    expect(new Set(sentences).size).toBe(KINDS.length);
  });

  /* The mistake the union parameter exists to prevent: an ended session reported
     as a passing network problem, which asks the customer to retry forever. */
  it('does not tell a signed-out customer to try again in a moment', () => {
    expect(addressRefusal('SIGNED_OUT', en.account)).not.toBe(en.account.addressesUnavailable);
  });
});

describe('why a change to the book was refused, recovered from the error', () => {
  it.each(KINDS)('reads a %s refusal back as itself', (kind) => {
    expect(addressFailureOf({ kind })).toBe(kind);
  });

  it.each([
    ['a kind this page does not know', { kind: 'SOMETHING_ELSE' }],
    ['a kind that is not a string', { kind: 409 }],
    ['an exception, not a refusal', new Error('boom')],
    ['a thrown string', 'FULL'],
    ['nothing at all', null],
    ['undefined', undefined],
  ])('does not guess at %s', (_label, error) => {
    expect(addressFailureOf(error)).toBeNull();
  });
});
