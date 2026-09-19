import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { ROUTES } from '@/config/routes';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { CATALOGUE } from '@/lib/mocks/catalogue-db';
import { handlers } from '@/lib/mocks/handlers';

import { fetchProductSitemapPages } from './fetch-sitemap-pages';

/**
 * §30.5's product list for the sitemap, through the real client and its contract,
 * with the backend mocked at the HTTP layer (TEST-04). Both branches (TEST-05).
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

describe('fetchProductSitemapPages', () => {
  it('answers every launched product as the page it lives at, dated by the backend', async () => {
    const result = await fetchProductSitemapPages();
    const expected = CATALOGUE.map((record) => ({
      path: ROUTES.catalogue.detail(record.slug),
      lastModified: record.launchedAt,
    }));

    expect(result).toMatchObject({ ok: true, value: expect.arrayContaining(expected) });
    expect(result).toHaveProperty('value.length', expected.length);
  });

  it('refuses a feed that breaks the contract rather than listing half of it', async () => {
    server.use(
      http.get(`*${ENDPOINTS.catalogue.sitemap}`, () =>
        HttpResponse.json({ products: [{ slug: '', lastModifiedAt: 'yesterday' }] }),
      ),
    );

    const result = await fetchProductSitemapPages();

    expect(result).toMatchObject({ ok: false, error: { kind: 'CONTRACT_VIOLATION' } });
  });

  it('reports an unreachable backend as an error, never as an empty catalogue', async () => {
    server.use(http.get(`*${ENDPOINTS.catalogue.sitemap}`, () => HttpResponse.error()));

    const result = await fetchProductSitemapPages();

    expect(result).toMatchObject({ ok: false, error: { kind: 'NETWORK' } });
  });
});
