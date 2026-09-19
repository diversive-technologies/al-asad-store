import { renderToStaticMarkup } from 'react-dom/server';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { Footer } from '@/components/layout/Footer';
import { HELP_PAGE_SLUGS, ROUTES, STORE_PAGE_SLUGS } from '@/config/routes';
import { LOCALES, type Locale } from '@/i18n/locales';
import { en } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';
import { handlers } from '@/lib/mocks/handlers';

import { fetchPage } from './fetch-page';

/**
 * §28.4 / §21 — every help and store page the footer links is a page the Content
 * module actually serves, in both locales, read through the real client and its
 * contract with the backend mocked at the HTTP layer (TEST-04). A footer link to
 * a slug nobody serves would be a 404 on every page of the store.
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

/** A served page's title, or `undefined` when none was served. */
async function titleOf(slug: string, locale: Locale): Promise<string | undefined> {
  const result = await fetchPage(slug, locale);
  return result.ok ? result.value?.title : undefined;
}

describe('the pages the footer links', () => {
  it.each(LOCALES)('include every help and store page in %s', (locale) => {
    expect(footerSlugs(locale).sort()).toEqual(
      [...Object.values(HELP_PAGE_SLUGS), ...Object.values(STORE_PAGE_SLUGS)].sort(),
    );
  });

  it.each(LINKED)('serve %s in %s', async (slug, locale) => {
    const result = await fetchPage(slug, locale);

    expect(result).toMatchObject({ ok: true, value: { slug } });
    expect(result).toHaveProperty('value.blocks', expect.arrayContaining([expect.anything()]));
  });

  it.each(Object.values(STORE_PAGE_SLUGS))(
    'are written in Urdu, not English, at %s',
    async (slug) => {
      const [english, urdu] = await Promise.all([titleOf(slug, 'en'), titleOf(slug, 'ur')]);

      expect(urdu).toMatch(/[\u0600-\u06FF]/);
      expect(urdu).not.toBe(english);
    },
  );
});
