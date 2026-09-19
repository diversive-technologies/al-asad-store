import { devices, expect, test } from '@playwright/test';

import { en } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';

import { openBuyableProduct, openCatalogue } from './support/catalogue';
import { expectNoSidewaysScroll } from './support/layout';
import { addToBagButton, byTap } from './support/product';

/*
 * A phone: a touch screen with no hover, at a phone's width. The product page
 * was once wider than every phone screen, which dragged the bag panel off it too
 * (PROGRESS, "Phone layout"); this journey is the check on both.
 */
test.use({ ...devices['Pixel 7'] });

test('on a phone, a size is tapped, bagged, changed and removed without anything leaving the screen', async ({
  page,
}) => {
  await openCatalogue(page);
  await expectNoSidewaysScroll(page);

  const product = await openBuyableProduct(page, byTap);
  await expectNoSidewaysScroll(page);

  await addToBagButton(page).tap();
  const bag = page.getByRole('dialog', { name: en.bag.title });
  await expect(bag).toBeVisible();

  // The panel sits inside the screen, not a page widened past it.
  const screen = page.viewportSize();
  const panel = await bag.boundingBox();
  expect(screen).not.toBeNull();
  expect(panel).not.toBeNull();
  expect(panel?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((panel?.x ?? 0) + (panel?.width ?? Infinity)).toBeLessThanOrEqual(screen?.width ?? 0);

  const line = bag
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: product.name }) })
    .first();
  await expect(line).toBeVisible();

  // One more: a single unit cannot be decreased, two can.
  const decrease = line.getByRole('button', { name: en.bag.decrease });
  await expect(decrease).toBeDisabled();
  await line.getByRole('button', { name: en.bag.increase }).tap();
  await expect(decrease).toBeEnabled();

  // Removal is confirmed first, then said aloud once the line has gone.
  await line.getByRole('button', { name: en.bag.remove, exact: true }).tap();
  await expect(bag.getByText(en.bag.removeBody)).toBeVisible();
  await bag.getByRole('button', { name: en.bag.removeConfirm }).tap();
  await expect(
    bag
      .getByRole('status')
      .filter({ hasText: formatTemplate(en.bag.removedStatus, { item: product.name }) }),
  ).toBeVisible();
  await expect(bag.getByText(en.bag.emptyBody)).toBeVisible();
  await expectNoSidewaysScroll(page);
});
