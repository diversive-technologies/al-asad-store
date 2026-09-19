import { expect, test, type Locator, type Page } from '@playwright/test';

import { ROUTES } from '@/config/routes';
import { en } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';

import { listingCards, openCatalogue, openProductWhere } from './support/catalogue';
import { productCodeOf } from './support/product';
import { ARRIVAL } from './support/server';

/** The header's search panel, opened from the bar (§28.1). */
async function openSearchPanel(page: Page): Promise<Locator> {
  await page.getByRole('banner').getByRole('button', { name: en.search.inputLabel }).click();
  const panel = page.getByRole('dialog', { name: en.search.title });
  await expect(panel).toBeVisible();
  return panel;
}

/**
 * §15 / §28.1 — search: the panel suggests as the customer types, a suggestion
 * runs a search, and a product code goes straight to its product.
 */
test.describe('search', () => {
  test('typing offers suggestions, and choosing one lists its results', async ({ page }) => {
    await page.goto(ROUTES.home);
    const panel = await openSearchPanel(page);

    // What to type comes from the panel itself: the start of its first trending search.
    const trending = panel
      .getByRole('region', { name: en.search.trendingHeading })
      .getByRole('button')
      .first();
    const fragment = (await trending.innerText()).trim().slice(0, 3).toLowerCase();

    await panel.getByRole('searchbox', { name: en.search.inputLabel }).fill(fragment);
    // The panel has answered for exactly what was typed, not an earlier keystroke.
    await expect(
      panel.getByRole('button', {
        name: formatTemplate(en.search.viewAllTerm, { term: fragment }),
      }),
    ).toBeVisible();

    const suggestion = panel
      .getByRole('region', { name: en.search.suggestionsHeading })
      .getByRole('button')
      .first();
    const term = (await suggestion.innerText()).trim();
    await suggestion.click();

    await expect(page).toHaveURL(
      (url) => url.pathname === ROUTES.search && url.searchParams.get('q') === term,
      ARRIVAL,
    );
    await expect(page.getByRole('heading', { level: 1, name: term })).toBeVisible();
    await expect(listingCards(page).first()).toBeVisible();
  });

  test('a product code typed into search opens that product', async ({ page }) => {
    // The code is read off a product page, never written into the test.
    await openCatalogue(page);
    const product = await openProductWhere(page, 'shows a product code', productCodeOf);

    await page.goto(ROUTES.home);
    const panel = await openSearchPanel(page);
    const field = panel.getByRole('searchbox', { name: en.search.inputLabel });
    await field.fill(product.found);
    await field.press('Enter');

    await expect(page).toHaveURL((url) => url.pathname === product.address, ARRIVAL);
    await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible();
  });
});
