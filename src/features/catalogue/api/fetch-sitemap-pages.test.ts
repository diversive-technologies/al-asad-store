import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { ROUTES } from '@/config/routes';
import { ENDPOINTS } from '@/lib/api/endpoints';

import type { SitemapProduct } from '../schemas/sitemap.schema';
import { fetchProductSitemapPages } from './fetch-sitemap-pages';

/**
 * §30.5's product list for the sitemap, through the real client and its contract,
 * with the backend mocked at the HTTP layer (TEST-04). Both branches (TEST-05).
 *
 * Which products are launched is the backend's rule (DATA-13), so every case
 * answers the feed itself and asserts only what this side does with it.
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

/** The feed as Java writes it — one date in UTC, one with the offset DATA-12 accepts. */
const FIRST: SitemapProduct = {
  slug: 'fixture-kurta-1',
  lastModifiedAt: '2026-08-01T00:00:00.000Z',
};
const SECOND: SitemapProduct = {
  slug: 'fixture-kurta-2',
  lastModifiedAt: '2026-07-31T05:00:00+05:00',
};
const FEED = [FIRST, SECOND];

function answerSitemapWith(response: () => Response): void {
  server.use(http.get(`*${ENDPOINTS.catalogue.sitemap}`, response));
}

describe('fetchProductSitemapPages', () => {
  it('answers every launched product as the page it lives at, dated by the backend', async () => {
    answerSitemapWith(() => HttpResponse.json({ products: FEED }));

    const result = await fetchProductSitemapPages();

    expect(result).toEqual({
      ok: true,
      value: [
        { path: ROUTES.catalogue.detail(FIRST.slug), lastModified: FIRST.lastModifiedAt },
        { path: ROUTES.catalogue.detail(SECOND.slug), lastModified: SECOND.lastModifiedAt },
      ],
    });
  });

  it('refuses a feed that breaks the contract rather than listing half of it', async () => {
    answerSitemapWith(() =>
      HttpResponse.json({ products: [...FEED, { slug: '', lastModifiedAt: 'yesterday' }] }),
    );

    const result = await fetchProductSitemapPages();

    expect(result).toMatchObject({ ok: false, error: { kind: 'CONTRACT_VIOLATION' } });
  });

  it('reports an unreachable backend as an error, never as an empty catalogue', async () => {
    answerSitemapWith(() => HttpResponse.error());

    const result = await fetchProductSitemapPages();

    expect(result).toMatchObject({ ok: false, error: { kind: 'NETWORK' } });
  });
});
