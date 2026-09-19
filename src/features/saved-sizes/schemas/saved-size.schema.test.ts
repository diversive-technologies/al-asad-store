import { describe, expect, it } from 'vitest';

import { savedSizeBody } from '@/lib/mocks/request-bodies';

import { MAX_SAVED_SIZES, savedSizeChoiceSchema, savedSizesSchema } from './saved-size.schema';

/**
 * The saved sizes' contract (SSOT-09), and the one body the mock backend reads
 * from it. The mock states its wire shapes for itself (MOD-01), so this holds the
 * two together: what the storefront sends must be a body the mock accepts.
 */

const SET_ID = '00000000-0000-4000-8000-0000000000aa';

function entry(sizeSetId: string, sizeId: string): unknown {
  return {
    sizeSet: { id: sizeSetId, name: 'Clothing sizes' },
    size: { id: sizeId, label: 'M' },
    savedAt: '2026-09-01T10:00:00.000Z',
  };
}

describe('a saved-size choice', () => {
  it('is a body the mock backend reads', () => {
    const sent = savedSizeChoiceSchema.parse({ sizeId: crypto.randomUUID() });

    expect(savedSizeBody.safeParse(sent).success).toBe(true);
  });

  it.each([
    ['no size', {}],
    ['a size id that is not an id', { sizeId: 'M' }],
  ])('refuses %s', (_label, body) => {
    expect(savedSizeChoiceSchema.safeParse(body).success).toBe(false);
  });
});

describe('the saved sizes a backend answers with', () => {
  it('accepts one size per chart', () => {
    const answer = {
      sizes: [entry(SET_ID, crypto.randomUUID()), entry(crypto.randomUUID(), crypto.randomUUID())],
    };

    expect(savedSizesSchema.safeParse(answer).success).toBe(true);
  });

  it('refuses two current sizes for one chart', () => {
    const answer = {
      sizes: [entry(SET_ID, crypto.randomUUID()), entry(SET_ID, crypto.randomUUID())],
    };

    expect(savedSizesSchema.safeParse(answer).success).toBe(false);
  });

  it('refuses a list longer than any catalogue has charts for (SEC-02)', () => {
    const sizes = Array.from({ length: MAX_SAVED_SIZES + 1 }, () =>
      entry(crypto.randomUUID(), crypto.randomUUID()),
    );

    expect(savedSizesSchema.safeParse({ sizes }).success).toBe(false);
  });
});
