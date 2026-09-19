import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';
import { sizeIdSchema, type SizeId } from '@/lib/domain/ids';
import { handlers } from '@/lib/mocks/handlers';
import { STANDARD_SIZE_SET } from '@/lib/mocks/size-sets-db';

import { fetchSavedSizes, forgetSize, rememberSize } from './saved-sizes-server';

/**
 * §28.3's saved sizes below the Route Handler: the real API client, its schema
 * check, and the mock backend at the HTTP layer (TEST-04). What it pins is what a
 * store test cannot reach — that the account travels as a HEADER, that the
 * answer parses, and that both sides of every Result arrive (TEST-05).
 *
 * Each test names its own account, because the store is append-only and keeps
 * everything it is told (D6).
 */

const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

/** Parsed rather than cast, so the id is branded the way a payload's is (TS-12). */
function sizeAt(index: number): SizeId {
  return sizeIdSchema.parse(STANDARD_SIZE_SET.sizes[index]?.id);
}

const MEDIUM = sizeAt(2);
const LARGE = sizeAt(3);

describe('the saved sizes, read and written for an account', () => {
  it('reads an empty list for an account that has saved nothing', async () => {
    await expect(fetchSavedSizes('api.empty@example.com', 'en')).resolves.toEqual({
      ok: true,
      value: { sizes: [] },
    });
  });

  it('remembers a size and answers with the list, named in the language asked for', async () => {
    const result = await rememberSize('api.remember@example.com', MEDIUM, 'ur');

    expect(result).toMatchObject({
      ok: true,
      value: {
        sizes: [{ sizeSet: { name: STANDARD_SIZE_SET.name.ur }, size: { id: MEDIUM, label: 'M' } }],
      },
    });
  });

  it('keeps one account’s sizes from another, because the owner is the header', async () => {
    await rememberSize('api.owner@example.com', LARGE, 'en');

    await expect(fetchSavedSizes('api.someone.else@example.com', 'en')).resolves.toEqual({
      ok: true,
      value: { sizes: [] },
    });
  });

  it('forgets the current size and answers with what is left', async () => {
    const account = 'api.forget@example.com';
    await rememberSize(account, MEDIUM, 'en');

    await expect(forgetSize(account, MEDIUM, 'en')).resolves.toEqual({
      ok: true,
      value: { sizes: [] },
    });
  });

  it.each([
    [
      'remembering a size of no chart',
      () => rememberSize('api.nope@example.com', unknownSize(), 'en'),
    ],
    [
      'forgetting a size that is not the current one',
      () => forgetSize('api.stale@example.com', LARGE, 'en'),
    ],
  ])('answers %s as NOT_FOUND', async (_label, call) => {
    await expect(call()).resolves.toMatchObject({ ok: false, error: { kind: 'NOT_FOUND' } });
  });

  it('refuses a list that holds two current sizes for one chart', async () => {
    const entry = {
      sizeSet: { id: STANDARD_SIZE_SET.id, name: 'Clothing sizes' },
      size: { id: MEDIUM, label: 'M' },
      savedAt: '2026-09-01T10:00:00.000Z',
    };
    server.use(
      http.get(`*${ENDPOINTS.account.savedSizes}`, () =>
        HttpResponse.json({ sizes: [entry, { ...entry, size: { id: LARGE, label: 'L' } }] }),
      ),
    );

    await expect(fetchSavedSizes('api.contract@example.com', 'en')).resolves.toMatchObject({
      ok: false,
      error: { kind: 'CONTRACT_VIOLATION' },
    });
  });
});

function unknownSize(): SizeId {
  return sizeIdSchema.parse('00000000-0000-4000-8000-00000000abcd');
}
