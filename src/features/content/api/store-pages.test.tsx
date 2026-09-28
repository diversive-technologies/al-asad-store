import { renderToStaticMarkup } from 'react-dom/server';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { Footer } from '@/components/layout/Footer';
import { HELP_PAGE_SLUGS, ROUTES, STORE_PAGE_SLUGS } from '@/config/routes';
import { LOCALES, type Locale } from '@/i18n/locales';
import { en } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';
import { ENDPOINTS } from '@/lib/api/endpoints';

import type { StaticPage } from '../schemas/page.schema';
import { fetchPage } from './fetch-page';

/**
 * §28.4 / §21 — every help and store page the footer links is a page the Content
 * module is asked for by the slug the footer spells, in both locales, read
 * through the real client and its contract with the backend mocked at the HTTP
 * layer (TEST-04). Which pages exist, and in which words, is the backend's; what
 * this side owns is that the footer links every one and that `fetchPage` asks
 * for exactly what was linked — and that a page nobody serves reads as no page,
 * for the route to 404, while a failed read stays an error (TEST-05).
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

const MESSAGES = { en, ur } as const;
const HELP_PREFIX = ROUTES.help.page('');

/** The content slugs a rendered footer links to, in the order it links them. */
function footerSlugs(locale: Locale): string[] {
  const markup = renderToStaticMarkup(
    <Footer messages={MESSAGES[locale]} newsletter={null} localeSwitcher={null} />,
  );
  return [...markup.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1] ?? '')
    .filter((href) => href.startsWith(HELP_PREFIX))
    .map((href) => decodeURIComponent(href.slice(HELP_PREFIX.length)));
}

const LINKED = LOCALES.flatMap((locale) =>
  footerSlugs(locale).map((slug): [string, Locale] => [slug, locale]),
);

/** The smallest page the contract admits, standing for whatever the backend holds at `slug`. */
function pageAt(slug: string): StaticPage {
  return {
    slug,
    title: 'Placeholder title',
    intro: 'Placeholder introduction.',
    blocks: [{ kind: 'PARAGRAPH', id: 'p1', text: 'Placeholder paragraph.' }],
  };
}

/**
 * The backend holding one page: it answers that slug in that locale, and a 404
 * to any other question — so a read that asked for anything else finds nothing.
 */
function holdPage(slug: string, locale: Locale): void {
  server.use(
    http.get(`*${ENDPOINTS.content.page}`, ({ request }) => {
      const asked = new URL(request.url).searchParams;
      const isThePage = asked.get('slug') === slug && asked.get('locale') === locale;
      return isThePage ? HttpResponse.json(pageAt(slug)) : new HttpResponse(null, { status: 404 });
    }),
  );
}

describe('the pages the footer links', () => {
  it.each(LOCALES)('include every help and store page in %s', (locale) => {
    expect(footerSlugs(locale).sort()).toEqual(
      [...Object.values(HELP_PAGE_SLUGS), ...Object.values(STORE_PAGE_SLUGS)].sort(),
    );
  });

  it.each(LINKED)('are asked for as %s in %s', async (slug, locale) => {
    holdPage(slug, locale);

    const result = await fetchPage(slug, locale);

    expect(result).toEqual({ ok: true, value: pageAt(slug) });
  });

  it.each([
    [
      'as no page, for the route to 404, when the backend serves none',
      404,
      { ok: true, value: null },
    ],
    [
      'as an error, never as a missing page, when the read fails',
      500,
      { ok: false, error: { kind: 'SERVER' } },
    ],
  ])('read %s', async (_label, status, expected) => {
    server.use(http.get(`*${ENDPOINTS.content.page}`, () => new HttpResponse(null, { status })));

    const result = await fetchPage(STORE_PAGE_SLUGS.delivery, 'en');

    expect(result).toMatchObject(expected);
  });
});
