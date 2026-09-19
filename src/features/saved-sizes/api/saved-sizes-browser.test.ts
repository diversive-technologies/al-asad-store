import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/config/routes';
import { sizeIdSchema } from '@/lib/domain/ids';

import { postSavedSize, postSavedSizeRemoval, readSavedSizes } from './saved-sizes-browser';

/**
 * The browser half of §28.3's saved sizes, against its BFF mocked at the HTTP
 * layer (TEST-04), so the real reader and its schema check run.
 *
 * What it pins is the mapping the customer's words depend on: an ended session,
 * a size that is not what the page thinks, and everything else are three
 * different sentences, and a malformed answer must never pass as a list.
 */

const ORIGIN = 'http://store.test';
const SAVED = `${ORIGIN}${ROUTES.api.savedSizes}`;
const REMOVAL = `${ORIGIN}${ROUTES.api.savedSizeRemoval}`;
const MEDIUM = sizeIdSchema.parse('00000000-0000-4000-8000-000000000002');

const LIST = {
  sizes: [
    {
      sizeSet: { id: '00000000-0000-4000-8000-0000000000aa', name: 'Clothing sizes' },
      size: { id: MEDIUM, label: 'M' },
      savedAt: '2026-09-01T10:00:00.000Z',
    },
  ],
};

const server = setupServer();

beforeAll(() => {
  // The interceptor resolves a relative address against `location`, as a browser does.
  vi.stubGlobal('location', { href: `${ORIGIN}/catalogue` });
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe('the saved sizes, from the browser', () => {
  it('reads the list', async () => {
    server.use(http.get(SAVED, () => HttpResponse.json(LIST)));

    await expect(readSavedSizes()).resolves.toMatchObject({
      ok: true,
      value: { sizes: [{ size: { label: 'M' } }] },
    });
  });

  it('sends only the size to remember, and takes the list it answers with', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(SAVED, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(LIST);
      }),
    );

    await expect(postSavedSize(MEDIUM)).resolves.toMatchObject({ ok: true });
    expect(bodies).toEqual([{ sizeId: MEDIUM }]);
  });

  it.each([
    { label: 'an ended session', status: 401, kind: 'SIGNED_OUT' },
    { label: 'a size that is not what the page thinks', status: 404, kind: 'GONE' },
    { label: 'the store unreachable', status: 502, kind: 'UNREACHABLE' },
    { label: 'another origin refused', status: 403, kind: 'UNREACHABLE' },
  ])('reports $label as $kind', async ({ status, kind }) => {
    server.use(http.post(REMOVAL, () => new HttpResponse(null, { status })));

    await expect(postSavedSizeRemoval(MEDIUM)).resolves.toEqual({ ok: false, error: { kind } });
  });

  it.each([
    { label: 'a request that never completed', respond: () => HttpResponse.error() },
    { label: 'a body that is not a list', respond: () => HttpResponse.json({ sizes: 'M' }) },
  ])('reports $label as unreachable, never as a list', async ({ respond }) => {
    server.use(http.get(SAVED, respond));

    await expect(readSavedSizes()).resolves.toEqual({ ok: false, error: { kind: 'UNREACHABLE' } });
  });
});
