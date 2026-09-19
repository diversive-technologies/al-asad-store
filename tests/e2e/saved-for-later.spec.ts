import { expect, test } from '@playwright/test';

import { ROUTES } from '@/config/routes';
import { en } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';

import {
  listingCards,
  openBuyableProduct,
  openCatalogue,
  productsSharingASize,
} from './support/catalogue';
import { addToBagButton, byKeyboard, wholeProductSizes } from './support/product';
import { signInAsNewCustomer } from './support/session';

/**
 * §28.3 / §16 — what a signed-in customer keeps for later: a bag line moved to
 * the saved items, and a size saved once and chosen for them on the next product.
 */
test.describe('kept for later', () => {
  test.beforeEach(async ({ context }) => {
    await signInAsNewCustomer(context);
  });

  test('a bag line moved to saved items leaves the bag and appears on the saved list', async ({
    page,
  }) => {
    await openCatalogue(page);
    const product = await openBuyableProduct(page);
    await addToBagButton(page).click();

    const bag = page.getByRole('dialog', { name: en.bag.title });
    const line = bag
      .getByRole('listitem')
      .filter({ has: page.getByRole('link', { name: product.name }) })
      .first();
    await line.getByRole('button', { name: en.bag.moveToSaved }).click();

    await expect(
      bag
        .getByRole('status')
        .filter({ hasText: formatTemplate(en.bag.movedStatus, { item: product.name }) }),
    ).toBeVisible();
    await expect(bag.getByText(en.bag.emptyBody)).toBeVisible();

    await page.goto(ROUTES.wishlist);
    await expect(
      listingCards(page).getByRole('heading', { level: 3, name: product.name, exact: true }),
    ).toBeVisible();
  });

  test('a size saved on one product is chosen for the customer on the next', async ({ page }) => {
    const { first, second, size } = await productsSharingASize(page);

    await page.goto(first);
    const chosen = wholeProductSizes(page).getByRole('radio', { name: size, exact: true });
    await byKeyboard(chosen);
    await expect(chosen).toBeChecked();
    await page
      .getByRole('main')
      .getByRole('button', { name: formatTemplate(en.savedSizes.remember, { size }) })
      .click();
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: formatTemplate(en.savedSizes.remembered, { size }) }),
    ).toBeVisible();

    // On the next product it is already chosen, named as theirs, and ready to buy.
    await page.goto(second);
    const saved = wholeProductSizes(page).getByRole('radio', {
      name: formatTemplate(en.savedSizes.sizeSavedName, { size }),
      exact: true,
    });
    await expect(saved).toBeChecked();
    await expect(
      page.getByRole('status').filter({ hasText: en.savedSizes.prefilled }),
    ).toBeVisible();
    await expect(addToBagButton(page)).toBeEnabled();
  });
});
