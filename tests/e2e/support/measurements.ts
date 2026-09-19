import { expect, type Page } from '@playwright/test';

import { en } from '@/i18n/messages/en';

import { messagePattern } from './copy';

/**
 * §34 — figures a customer would copy off a garment they own, in inches, keyed by
 * the field's label as the studio draws it.
 *
 * They are the set the mock's own unit tests hold valid (`profiles-db.test.ts`,
 * `stitched-line.test.ts`): every figure inside its point's range, the hem wider
 * than the chest, the shoulder and neck where the tailor's rules expect them
 * beside a 21 in chest, and a waistcoat chest over the kameez's — so a check
 * raises neither a refusal nor a note. Whichever style a product is cut as, its
 * required fields are among these.
 */
const GARMENT_FIGURES: Readonly<Record<string, string>> = {
  'Kameez length': '40',
  'Sleeve length': '24',
  Shoulder: '18',
  Neck: '15.5',
  Chest: '21',
  'Hem (Ghera)': '22',
  'Shalwar length': '40',
  'Trouser bottom (Poncha)': '7.5',
  'Waistcoat length': '28',
  'Waistcoat shoulder': '17',
  'Waistcoat chest': '22',
};

/**
 * Types every figure the studio asks for, then reads its own progress line to
 * prove every REQUIRED one was among them: a style that gained a required point
 * this table does not know fails here, by name of the count, rather than at a
 * check further on.
 */
export async function fillRequiredFigures(page: Page): Promise<void> {
  const main = page.getByRole('main');

  for (const [label, figure] of Object.entries(GARMENT_FIGURES)) {
    const field = main.getByRole('textbox', { name: label, exact: true });
    if ((await field.count()) > 0) await field.fill(figure);
  }

  const progress = main.getByText(messagePattern(en.madeToMeasure.progress));
  const [, done, total] = messagePattern(en.madeToMeasure.progress).exec(
    (await progress.innerText()).trim(),
  ) ?? [undefined, 'none', 'unknown'];
  expect(done, 'every required measurement has a figure').toBe(total);
}
