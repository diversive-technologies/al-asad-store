import { expect, test, type Page } from '@playwright/test';

import { ROUTES } from '@/config/routes';
import { en } from '@/i18n/messages/en';
import { formatPlural } from '@/lib/utils/format';

import { listingCards, openCatalogue } from './support/catalogue';
import { signInAsNewCustomer } from './support/session';
import { ARRIVAL } from './support/server';

/** Follows one of the header's account menu links, as a signed-in customer does. */
async function openFromAccountMenu(page: Page, link: string): Promise<void> {
  await page.getByRole('banner').getByRole('button', { name: en.auth.accountMenuLabel }).click();
  await page.getByRole('link', { name: link, exact: true }).click();
}

/**
 * §28.3 — the signed-in customer. The session is the D3 mock cookie, set
 * directly; every journey signs in a NEW customer, so what an account holds is
 * only what the journey itself put there.
 */
test.describe('a signed-in customer', () => {
  test('saves a product with the heart and finds it on the saved-items page', async ({
    page,
    context,
  }) => {
    await signInAsNewCustomer(context);
    await openCatalogue(page);
    const card = listingCards(page).first();
    const name = (await card.getByRole('heading', { level: 3 }).innerText()).trim();

    await card.getByRole('button', { name: en.catalogue.wishlistAdd }).click();
    // The same button, by the same name, now says it is pressed.
    await expect(card.getByRole('button', { name: en.catalogue.wishlistAdd })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await openFromAccountMenu(page, en.wishlist.navLabel);
    await expect(page).toHaveURL((url) => url.pathname === ROUTES.wishlist, ARRIVAL);
    await expect(page.getByRole('heading', { level: 1, name: en.wishlist.title })).toBeVisible();
    await expect(listingCards(page)).toHaveCount(1);
    await expect(
      listingCards(page).first().getByRole('heading', { level: 3, name, exact: true }),
    ).toBeVisible();

    // The account page counts it too, in its own section.
    await openFromAccountMenu(page, en.account.navLabel);
    const section = page.getByRole('region', { name: en.account.savedItemsHeading });
    await expect(section.getByText(formatPlural(en.wishlist.savedCount, 1, 'en'))).toBeVisible();
    await expect(section.getByRole('link', { name: en.account.openSavedItems })).toBeVisible();
  });

  test('the account page shows who is signed in and every section of the account', async ({
    page,
    context,
  }) => {
    const session = await signInAsNewCustomer(context);

    await page.goto(ROUTES.home);
    await openFromAccountMenu(page, en.account.navLabel);
    await expect(page).toHaveURL((url) => url.pathname === ROUTES.account, ARRIVAL);
    await expect(page.getByRole('heading', { level: 1, name: en.account.title })).toBeVisible();

    const details = page.getByRole('region', { name: en.account.detailsHeading });
    await expect(details.getByText(session.displayName, { exact: true })).toBeVisible();
    await expect(details.getByText(session.email, { exact: true })).toBeVisible();
    await expect(details.getByText(en.account.detailsPlaceholder)).toBeVisible();

    // A new account: every section is there, and each says it holds nothing yet.
    const section = (heading: string) => page.getByRole('region', { name: heading });
    await expect(section(en.account.ordersHeading).getByText(en.account.ordersEmpty)).toBeVisible();
    await expect(
      section(en.account.addressesHeading).getByText(en.account.addressesEmpty),
    ).toBeVisible();
    await expect(section(en.savedSizes.heading).getByText(en.savedSizes.empty)).toBeVisible();
    await expect(
      section(en.account.savedItemsHeading).getByText(en.wishlist.emptyBody),
    ).toBeVisible();
    await expect(
      section(en.account.measurementsHeading).getByText(en.account.measurementsEmpty),
    ).toBeVisible();
  });
});
