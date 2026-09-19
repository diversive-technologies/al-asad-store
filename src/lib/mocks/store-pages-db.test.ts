import { describe, expect, it } from 'vitest';

import { LOCALES, type Locale } from '@/i18n/locales';

import type { StaticPagePayload } from './page-authoring';
import { POLICY_PAGES } from './policy-pages-db';
import { INFO_SECTIONS } from './product-content-db';
import { STORE_PAGES } from './store-pages-db';

/**
 * The FIXTURE store and policy pages may only say what the store does. These are
 * the ways such copy drifts into saying something else, held as tests: a figure
 * that configuration owns, a return window that disagrees with the product page,
 * and a promise of a message or a tracking service that nothing provides.
 */

const PAGES = { ...STORE_PAGES, ...POLICY_PAGES };

function textOf(page: StaticPagePayload): string {
  return [page.title, page.intro, ...page.blocks.map((block) => block.text ?? '')].join('\n');
}

const EVERY_PAGE = Object.entries(PAGES).flatMap(([slug, build]) =>
  LOCALES.map((locale) => ({ slug, locale, text: textOf(build(locale)) })),
);
const ENGLISH = EVERY_PAGE.filter((page) => page.locale === 'en');

/** One page's words in one locale, or nothing when no such page is served. */
function pageText(slug: string, locale: Locale): string {
  const build = PAGES[slug];
  return build === undefined ? '' : textOf(build(locale));
}

describe('the store and policy pages', () => {
  it.each(EVERY_PAGE.map((page) => [page.slug, page.locale, page.text]))(
    '%s (%s) states no figure that configuration could change under it',
    (_slug, _locale, text) => {
      // Charges, the free-delivery threshold, the cash on delivery limit and
      // transit times are served by the checkout mocks; a digit here would drift.
      expect(text).not.toMatch(/\d/);
    },
  );

  it.each(ENGLISH.map((page) => [page.slug, page.text]))(
    '%s promises no message, tracking or form the store does not have',
    (_slug, text) => {
      expect(text).not.toMatch(
        /we will (email|text|message|send|notify)|you will receive|track your (order|parcel)|confirmation (sms|text|email)|return form (below|here)/i,
      );
    },
  );

  it.each([
    ['en', 'seven days'],
    ['ur', 'سات دن'],
  ] as const)('give the same return window as the product page, in %s', (locale, returnWindow) => {
    const productPage = INFO_SECTIONS[locale].find((section) => section.id === 'delivery');

    expect(productPage?.body).toContain(returnWindow);
    expect(pageText('returns-and-exchanges', locale)).toContain(returnWindow);
    expect(pageText('contact-us', locale)).toContain(returnWindow);
  });
});
