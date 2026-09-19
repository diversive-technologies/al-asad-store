import { expect, test } from '@playwright/test';

import { ROUTES } from '@/config/routes';
import { en } from '@/i18n/messages/en';

import { openBuyableProduct } from './support/catalogue';
import { escapeRegExp, messagePattern } from './support/copy';
import { addToBagButton } from './support/product';
import { ARRIVAL } from './support/server';

/**
 * §28.2 — a guest buys: browse to the catalogue, open a product, choose a size,
 * put it in the bag, and pay by a method the store offers. No account is
 * involved, because guest checkout is Release 1 scope.
 */
test('a guest browses to a product, bags a size and places an order', async ({ page }) => {
  await page.goto(ROUTES.home);
  await page
    .getByRole('navigation', { name: en.nav.footerLabel })
    .getByRole('link', { name: en.nav.catalogue, exact: true })
    .click();
  await expect(page).toHaveURL((url) => url.pathname === ROUTES.catalogue.list, ARRIVAL);
  await expect(page.getByRole('heading', { level: 1, name: en.catalogue.title })).toBeVisible();

  // The first card whose product can be bought in a plain, in-stock size.
  const product = await openBuyableProduct(page);

  await addToBagButton(page).click();
  const bag = page.getByRole('dialog', { name: en.bag.title });
  await expect(bag).toBeVisible();
  const line = bag
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: product.name }) })
    .first();
  await expect(line).toBeVisible();
  // Each piece is listed with the size it was bagged in (§28.2's per-piece display).
  await expect(
    line.getByText(new RegExp(`· ${escapeRegExp(product.found)}$`)).first(),
  ).toBeVisible();

  await bag.getByRole('link', { name: en.bag.checkout }).click();
  await expect(page).toHaveURL((url) => url.pathname === ROUTES.checkout, ARRIVAL);
  await expect(page.getByRole('heading', { level: 1, name: en.checkout.title })).toBeVisible();
  // The panel is a MODAL dialog that stays open through its exit animation
  // (`useNativeDialog`), and the page under a modal dialog is inert. On a warm
  // server the form is drawn inside that window, and `fill` does not check for
  // inertness: it typed into fields that could not take focus and the order was
  // refused as empty. No person types that fast; the journey waits as they would.
  await expect(bag).toBeHidden();

  const form = page.getByRole('main');
  await form.getByRole('textbox', { name: en.checkout.nameLabel, exact: true }).fill('Test Guest');
  await form
    .getByRole('textbox', { name: en.checkout.mobileLabel, exact: true })
    .fill('03001234567');
  await form
    .getByRole('textbox', { name: en.checkout.addressLabel, exact: true })
    .fill('House 12, Street 4, Gulberg III');
  await form.getByRole('textbox', { name: en.checkout.cityLabel, exact: true }).fill('Lahore');

  // The methods are the backend's (§3.1: a served list, each with its own label
  // and availability), so the journey takes the first one this order may use
  // rather than naming one — Cash on Delivery, in the fixture, until a cap is passed.
  const payment = form
    .getByRole('group', { name: en.checkout.paymentHeading })
    .getByRole('radio', { disabled: false })
    .first();
  await expect(payment).toBeEnabled();
  await payment.check();

  await form.getByRole('button', { name: en.checkout.place }).click();

  await expect(page).toHaveURL(
    (url) => url.pathname.startsWith(ROUTES.orderConfirmation('')),
    ARRIVAL,
  );
  const confirmation = page.getByRole('main');
  await expect(confirmation.getByRole('heading', { level: 1, name: en.order.title })).toBeVisible();
  const orderNumber = decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '');
  await expect(confirmation.getByText(orderNumber, { exact: true })).toBeVisible();
  await expect(confirmation.getByText('Test Guest', { exact: true })).toBeVisible();
  await expect(confirmation.getByText(product.name, { exact: true }).first()).toBeVisible();

  // Placing the order converted the bag, so it holds nothing any more.
  const bagButton = new RegExp(
    [en.bag.openWithCount.one, en.bag.openWithCount.other]
      .map((form) => messagePattern(form).source)
      .join('|'),
  );
  await page.getByRole('banner').getByRole('button', { name: bagButton }).click();
  await expect(bag.getByText(en.bag.emptyBody)).toBeVisible();
});
