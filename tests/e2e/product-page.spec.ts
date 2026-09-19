import { expect, test } from '@playwright/test';

import { en } from '@/i18n/messages/en';
import { formatNumber, formatTemplate } from '@/lib/utils/format';

import { openCatalogue, openProductWhere } from './support/catalogue';
import {
  galleryImageCount,
  productNameOf,
  sizedProduct,
  wholeProductNotifyChip,
  wholeProductSizes,
} from './support/product';
import { ARRIVAL, E2E_BASE_URL } from './support/server';
import { uniqueEmail } from './support/session';

/** §28.2 — what the product page offers beyond choosing a size and buying. */
test.describe('the product page', () => {
  test.beforeEach(async ({ page }) => {
    await openCatalogue(page);
  });

  test('the size guide opens over the page and hands focus back when it closes', async ({
    page,
  }) => {
    await openProductWhere(page, 'is sized', sizedProduct);
    const opener = wholeProductSizes(page).getByRole('button', { name: en.product.sizeGuide });

    await opener.click();
    const guide = page.getByRole('dialog', { name: en.product.sizeGuide });
    await expect(guide).toBeVisible();
    await expect(guide.getByRole('link', { name: en.help.openFullPage })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(guide).toBeHidden();
    await expect(opener).toBeFocused();

    await opener.click();
    await guide.getByRole('button', { name: en.common.close }).click();
    await expect(guide).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('copy link puts the product’s own address on the clipboard and says so', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: E2E_BASE_URL });
    const product = await openProductWhere(page, 'is sized', sizedProduct);

    await page.getByRole('main').getByRole('button', { name: en.product.copyLink }).click();

    await expect(
      page.getByRole('main').getByRole('status').filter({ hasText: en.product.linkCopied }),
    ).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(new URL(product.address, E2E_BASE_URL).href);
  });

  test('you may also like offers other products, and each opens its own page', async ({ page }) => {
    const product = await openProductWhere(page, 'is sized', sizedProduct);
    const related = page.getByRole('region', { name: en.product.relatedHeading });
    await expect(related.getByRole('article').first()).toBeVisible();

    const addresses = await related
      .getByRole('article')
      .getByRole('link')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses).not.toContain(product.address);

    const first = related.getByRole('article').first();
    const name = (await first.getByRole('heading', { level: 3 }).innerText()).trim();
    await first.getByRole('link').click();
    await expect(page).toHaveURL((url) => url.pathname === addresses[0], ARRIVAL);
    expect(await productNameOf(page)).toBe(name);
  });

  test('the gallery opens full screen, steps through the photographs and closes', async ({
    page,
  }) => {
    const product = await openProductWhere(page, 'has more than one photograph', galleryImageCount);
    const count = formatNumber(product.found, 'en');

    const opener = page.getByRole('main').getByRole('button', {
      name: formatTemplate(en.product.openFullscreen, { index: formatNumber(1, 'en'), count }),
    });
    await opener.click();

    const viewer = page.getByRole('dialog', {
      name: formatTemplate(en.product.fullscreenTitle, { name: product.name }),
    });
    await expect(viewer).toBeVisible();
    const position = viewer.getByRole('status');
    await expect(position).toHaveText(
      formatTemplate(en.product.imagePosition, { index: formatNumber(1, 'en'), count }),
    );

    await viewer.getByRole('button', { name: en.catalogue.nextImage }).click();
    await expect(position).toHaveText(
      formatTemplate(en.product.imagePosition, { index: formatNumber(2, 'en'), count }),
    );
    await page.keyboard.press('ArrowLeft');
    await expect(position).toHaveText(
      formatTemplate(en.product.imagePosition, { index: formatNumber(1, 'en'), count }),
    );

    await viewer.getByRole('button', { name: en.product.closeFullscreen }).click();
    await expect(viewer).toBeHidden();
  });

  test('notify me takes an address for a sold-out size and says what will happen', async ({
    page,
  }) => {
    const product = await openProductWhere(page, 'has a sold-out size', wholeProductNotifyChip);
    const { chip, size } = product.found;

    await chip.click();
    const form = page.getByRole('form', {
      name: formatTemplate(en.backInStock.formLead, { size }),
    });
    await expect(form).toBeVisible();
    await form
      .getByRole('textbox', { name: en.backInStock.emailLabel })
      .fill(uniqueEmail('notify'));
    await form.getByRole('button', { name: en.backInStock.submit, exact: true }).click();

    // A promise of an email LATER — §28.7's back-in-stock email is the backend's to send.
    await expect(
      page.getByRole('status').filter({
        hasText: formatTemplate(en.backInStock.recordedProduct, { product: product.name, size }),
      }),
    ).toBeVisible();
    await expect(form).toBeHidden();
  });
});
