import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import { addressBookSchema, addressChoiceSchema, addressWriteSchema } from './address.schema';

/**
 * Each request the address book sends passes its own contract before it leaves
 * for the backend: a new address, a revision of a saved one, and a choice among
 * them.
 */
const ADDRESS = {
  recipientName: 'Test Customer',
  recipientMobile: '03001234567',
  line: '12 Example Street, Block A',
  city: 'Lahore',
};

describe('the address book requests', () => {
  it.each<[string, z.ZodType, unknown]>([
    ['a new address', addressWriteSchema, { address: ADDRESS }],
    ['a revision', addressWriteSchema, { address: ADDRESS, addressId: crypto.randomUUID() }],
    ['a choice of address', addressChoiceSchema, { addressId: crypto.randomUUID() }],
  ])('accepts %s', (_label, contract, input) => {
    expect(contract.safeParse(input).success).toBe(true);
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
