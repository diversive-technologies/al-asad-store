import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import { addressChoiceBody, addressWriteBody } from '@/lib/mocks/request-bodies';

import { addressBookSchema, addressChoiceSchema, addressWriteSchema } from './address.schema';

/**
 * The mock that stands in for Java states each request's wire shape for itself
 * (MOD-01), so this holds the two together: what the address book sends must be
 * a body the mock accepts.
 */
const ADDRESS = {
  recipientName: 'Test Customer',
  recipientMobile: '03001234567',
  line: '12 Example Street, Block A',
  city: 'Lahore',
};

describe('the address book requests and the bodies the mock backend reads', () => {
  it.each<[string, z.ZodType, z.ZodType, unknown]>([
    ['a new address', addressWriteSchema, addressWriteBody, { address: ADDRESS }],
    [
      'a revision',
      addressWriteSchema,
      addressWriteBody,
      { address: ADDRESS, addressId: crypto.randomUUID() },
    ],
    [
      'a choice of address',
      addressChoiceSchema,
      addressChoiceBody,
      { addressId: crypto.randomUUID() },
    ],
  ])('%s passes both', (_label, contract, mock, input) => {
    const sent = contract.safeParse(input);

    expect(sent.success).toBe(true);
    expect(mock.safeParse(sent.data).success).toBe(true);
  });
});

/*
 * F7 — "exactly one default in a non-empty book" was a comment, not a check. A
 * book with none flagged parsed, and `/account` then told a customer holding
 * addresses "You have not saved an address yet".
 */
describe('the book the account is served', () => {
  const saved = (isDefault: boolean) => ({
    ...ADDRESS,
    id: crypto.randomUUID(),
    savedAt: '2026-09-17T10:00:00.000Z',
    isDefault,
  });

  it.each([
    ['empty', []],
    ['one address, the default', [saved(true)]],
    ['two addresses, one the default', [saved(false), saved(true)]],
  ])('accepts a book that is %s', (_label, addresses) => {
    expect(addressBookSchema.safeParse({ addresses }).success).toBe(true);
  });

  it.each([
    ['holds addresses and no default', [saved(false), saved(false)]],
    ['holds two defaults', [saved(true), saved(true)]],
  ])('refuses a book that %s, as a contract violation', (_label, addresses) => {
    expect(addressBookSchema.safeParse({ addresses }).success).toBe(false);
  });
});
