import { expect, test } from '@playwright/test';

import { ROUTES } from '@/config/routes';
import { ur } from '@/i18n/messages/ur';

import { openCard } from './support/catalogue';
import { startsWith } from './support/copy';
import { expectDocumentLanguage, expectNoSidewaysScroll } from './support/layout';
import { readInLocale } from './support/session';
import { ARRIVAL } from './support/server';

/**
 * I18N-12 — "an E2E smoke path runs in Urdu". The locale cookie a language
 * choice sets is set directly; every page must then come back right to left, in
 * Urdu words, with nothing mirrored off the edge of the screen.
 */
test('the store reads right to left in Urdu, from the homepage to a product', async ({
  page,
  context,
}) => {
  await readInLocale(context, 'ur');

  await page.goto(ROUTES.home);
  await expectDocumentLanguage(page, 'ur', 'rtl');
  const header = page.getByRole('banner');
  await expect(header.getByRole('button', { name: ur.search.inputLabel })).toBeVisible();
  await expect(header.getByRole('link', { name: ur.nav.stitchedCta })).toBeVisible();
  await expect(
    page.getByRole('contentinfo').getByRole('heading', { name: ur.footer.helpHeading }),
  ).toBeVisible();

  await page
    .getByRole('navigation', { name: ur.nav.footerLabel })
    .getByRole('link', { name: ur.nav.catalogue, exact: true })
    .click();
  await expect(page).toHaveURL((url) => url.pathname === ROUTES.catalogue.list, ARRIVAL);
  await expectDocumentLanguage(page, 'ur', 'rtl');
  await expect(page.getByRole('heading', { level: 1, name: ur.catalogue.title })).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('button', { name: startsWith(ur.catalogue.filtersHeading) }),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);

  // Waits for the product page to ARRIVE: the listing still on screen has an h1,
  // breadcrumbs and the same document language, so reading any earlier passes
  // against the listing.
  const { name } = await openCard(page, 0);
  expect(name).not.toBe(ur.catalogue.title);
  await expectDocumentLanguage(page, 'ur', 'rtl');
  // What every product page carries, whatever the product is sold by.
  const product = page.getByRole('main');
  await expect(product.getByRole('navigation', { name: ur.common.breadcrumbLabel })).toBeVisible();
  await expect(
    product.getByRole('button', { name: ur.product.addToBag, exact: true }),
  ).toBeVisible();
  await expect(
    product.getByRole('button', { name: ur.product.copyLink, exact: true }),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);
});
