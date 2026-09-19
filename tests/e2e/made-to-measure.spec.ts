import { expect, test } from '@playwright/test';

import { ROUTES } from '@/config/routes';
import { en } from '@/i18n/messages/en';

import { openCatalogue, openProductWhere } from './support/catalogue';
import { startsWith } from './support/copy';
import { fillRequiredFigures } from './support/measurements';
import { stitchingForkOf } from './support/product';
import { ARRIVAL } from './support/server';

/**
 * §34 — a garment cut to measure, from the product it is cut from: the fork under
 * Add to bag opens the studio on that garment, the figures are checked by the
 * server and shown back for review, the save is kept, and the saved confirmation
 * puts the garment in the bag as a made-to-measure line.
 */
test('a garment is measured from its product, checked, reviewed, saved and bagged', async ({
  page,
}) => {
  await openCatalogue(page);
  const product = await openProductWhere(page, 'offers stitching to measure', stitchingForkOf);

  await product.found.click();
  await expect(page).toHaveURL((url) => url.pathname === ROUTES.stitched, ARRIVAL);
  // The studio says which garment it is measuring for, and how to get back to it.
  await expect(
    page.getByRole('link', { name: startsWith(en.madeToMeasure.productFor) }),
  ).toContainText(product.name);

  const check = page.getByRole('button', { name: en.madeToMeasure.saveCta });

  // Nothing typed: the check lists what is missing instead of saving anything.
  await check.click();
  await expect(
    page.getByRole('heading', { name: en.madeToMeasure.errorSummaryTitle }),
  ).toBeVisible();

  await fillRequiredFigures(page);
  await check.click();

  // Every figure comes back twice — as typed, and as it will be kept — before a save.
  const review = page.getByRole('region', { name: en.madeToMeasure.reviewTitle });
  await expect(review).toBeVisible();
  await expect(
    review.getByRole('columnheader', { name: en.madeToMeasure.reviewColumnTyped }).first(),
  ).toBeVisible();
  await review.getByRole('button', { name: en.madeToMeasure.saveProfileCta }).click();

  // A guest's measurements are kept against this browser, and the page says so.
  const saved = page.getByRole('region', { name: en.madeToMeasure.savedTitle });
  await expect(saved).toBeVisible();
  await expect(saved.getByText(en.madeToMeasure.savedDevice)).toBeVisible();

  await saved.getByRole('button', { name: en.product.addToBag, exact: true }).click();

  const bag = page.getByRole('dialog', { name: en.bag.title });
  const line = bag.getByRole('listitem').filter({ hasText: en.stitched.madeToMeasure }).first();
  await expect(line).toBeVisible();
  await expect(line.getByRole('link', { name: product.name }).first()).toBeVisible();
  // §34.7's cut cutoff, where the garment is listed.
  await expect(line.getByText(en.stitched.noReturns)).toBeVisible();
});
