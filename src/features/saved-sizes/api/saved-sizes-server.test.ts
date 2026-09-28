import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { z } from 'zod';

import { ENDPOINTS } from '@/lib/api/endpoints';
import { API_HEADERS } from '@/lib/api/headers';
import { sizeIdSchema, type SizeId } from '@/lib/domain/ids';

import type { SavedSizes, savedSizesSchema } from '../schemas/saved-size.schema';
import { fetchSavedSizes, forgetSize, rememberSize } from './saved-sizes-server';

/**
 * §28.3's saved sizes below the Route Handler: the real API client, its schema
 * check, and per-test handlers at the HTTP layer (TEST-04). What it pins is the
 * part only this side owns — that the account travels as a HEADER and never in
 * the body, with the language as a parameter — that the answer parses, and that
 * both sides of every Result arrive (TEST-05). Which size is current for a set,
 * and in what words, is the backend's answer.
 */

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

const ACCOUNT = 'api.sizes@example.com';
const SIZE_SET_ID = '00000000-0000-4000-8000-0000000005e7';

/* Parsed rather than cast, so each id is branded the way a payload's is (TS-12). */
const MEDIUM = sizeIdSchema.parse('00000000-0000-4000-8000-000000000503');
const LARGE = sizeIdSchema.parse('00000000-0000-4000-8000-000000000504');

/** One current size of the fixture's chart, as the backend lists it. */
function savedEntry(sizeId: SizeId, label: string) {
  return {
    sizeSet: { id: SIZE_SET_ID, name: 'Clothing sizes' },
    size: { id: sizeId, label },
    savedAt: '2026-09-28T10:00:00.000Z',
  };
}

const NOTHING_SAVED: SavedSizes = { sizes: [] };

/** The list in the wire shape the backend answers with (SSOT-09). */
type SavedSizesWire = z.input<typeof savedSizesSchema>;

/** What reached the backend, recorded by the handler that answered it. */
interface Sent {
  readonly method: string;
  readonly path: string;
  readonly locale: string | null;
  readonly account: string | null;
  readonly body: unknown;
}

function answering(sink: Sent[], list: SavedSizesWire) {
  return async ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const text = await request.clone().text();
    sink.push({
      method: request.method,
      path: url.pathname,
      locale: url.searchParams.get('locale'),
      account: request.headers.get(API_HEADERS.accountKey),
      body: text.length === 0 ? null : JSON.parse(text),
    });
    return HttpResponse.json(list);
  };
}

describe('the saved sizes, read and written for an account', () => {
  it('reads an empty list for an account that has saved nothing', async () => {
    server.use(http.get(`*${ENDPOINTS.account.savedSizes}`, answering([], NOTHING_SAVED)));

    await expect(fetchSavedSizes(ACCOUNT, 'en')).resolves.toEqual({
      ok: true,
      value: NOTHING_SAVED,
    });
  });

  /* The owner is the header, so one account's sizes cannot be read or rewritten
     by naming another in a body. */
  it.each([
    ['a read', 'GET', ENDPOINTS.account.savedSizes, () => fetchSavedSizes(ACCOUNT, 'ur'), null],
    [
      'a save',
      'POST',
      ENDPOINTS.account.savedSizes,
      () => rememberSize(ACCOUNT, MEDIUM, 'ur'),
      { sizeId: MEDIUM },
    ],
    [
      'a removal',
      'POST',
      ENDPOINTS.account.savedSizeRemoval,
      () => forgetSize(ACCOUNT, MEDIUM, 'ur'),
      { sizeId: MEDIUM },
    ],
  ])('sends %s for the account named in the header', async (_label, method, path, call, body) => {
    const received: Sent[] = [];
    server.use(http.all(`*${path}`, answering(received, NOTHING_SAVED)));

    await call();

    expect(received).toEqual([{ method, path, locale: 'ur', account: ACCOUNT, body }]);
  });

  it('remembers a size and answers with the list the backend holds', async () => {
    const list = { sizes: [savedEntry(MEDIUM, 'M')] };
    server.use(http.post(`*${ENDPOINTS.account.savedSizes}`, answering([], list)));

    await expect(rememberSize(ACCOUNT, MEDIUM, 'en')).resolves.toEqual({ ok: true, value: list });
  });

  it('forgets the current size and answers with what is left', async () => {
    server.use(http.post(`*${ENDPOINTS.account.savedSizeRemoval}`, answering([], NOTHING_SAVED)));

    await expect(forgetSize(ACCOUNT, MEDIUM, 'en')).resolves.toEqual({
      ok: true,
      value: NOTHING_SAVED,
    });
  });

  it.each([
    [
      'remembering a size of no chart',
      ENDPOINTS.account.savedSizes,
      () => rememberSize(ACCOUNT, MEDIUM, 'en'),
    ],
    [
      'forgetting a size that is not the current one',
      ENDPOINTS.account.savedSizeRemoval,
      () => forgetSize(ACCOUNT, LARGE, 'en'),
    ],
  ])('answers %s as NOT_FOUND', async (_label, path, call) => {
    server.use(http.post(`*${path}`, () => new HttpResponse(null, { status: 404 })));

    await expect(call()).resolves.toMatchObject({ ok: false, error: { kind: 'NOT_FOUND' } });
  });

  it('refuses a list that holds two current sizes for one chart', async () => {
    server.use(
      http.get(`*${ENDPOINTS.account.savedSizes}`, () =>
        HttpResponse.json({ sizes: [savedEntry(MEDIUM, 'M'), savedEntry(LARGE, 'L')] }),
      ),
    );

    await expect(fetchSavedSizes(ACCOUNT, 'en')).resolves.toMatchObject({
      ok: false,
      error: { kind: 'CONTRACT_VIOLATION' },
    });
  });
});
