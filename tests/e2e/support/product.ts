import { expect, type Locator, type Page } from '@playwright/test';

import { en } from '@/i18n/messages/en';

import { readPlaceholder, startsWith } from './copy';

/**
 * The selector a whole product is sized by: a SET's unified size, or a SIMPLE
 * product's only one (§28.2). The per-piece groups of a SET come after it.
 */
export function wholeProductSizes(page: Page): Locator {
  const main = page.getByRole('main');
  return main
    .getByRole('group', { name: en.product.unifiedSizeHeading, exact: true })
    .or(main.getByRole('group', { name: en.product.selectSizeHeading, exact: true }));
}

/** Every size selector on the page — the whole product's and each piece's. */
export function sizeGroups(page: Page): Locator {
  return page
    .getByRole('main')
    .getByRole('group')
    .filter({ has: page.getByRole('radio') });
}

export function addToBagButton(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: en.product.addToBag, exact: true });
}

/** The product's own name, as its page heads itself. */
export async function productNameOf(page: Page): Promise<string> {
  const heading = page.getByRole('main').getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  return (await heading.innerText()).trim();
}

/** How a journey picks a size: by keyboard, or by a finger on the size itself. */
export type SizeGesture = (radio: Locator) => Promise<void>;

/** Space on the radio, as a customer tabbing through the selector does. */
export const byKeyboard: SizeGesture = async (radio) => {
  await radio.press('Space');
};

/**
 * A tap on the size as drawn. The radio is visually hidden and its LABEL is the
 * target a finger lands on, so the tap goes to the label the radio names.
 */
export const byTap: SizeGesture = async (radio) => {
  const id = await radio.getAttribute('id');
  if (id === null) throw new Error('A size radio without an id has no label to tap.');
  await radio.page().locator(`label[for="${id}"]`).tap();
};

/**
 * A size shown with no stock note — neither "Low stock" nor "Sold out" — so a
 * journey that adds it cannot run the size out from under itself. Every note is
 * appended after an em dash (`SizeRadio`), so a name without one has none.
 */
const PLAIN_SIZE = /^[^—]+$/;

/**
 * Chooses the first size the whole product can be bought in, and answers its
 * name — or `null` when there is none (sold out, or sold by length).
 *
 * The size comes from what the page SAYS each piece has (DATA-13 — the stock is
 * the backend's; the journey only reads it). A set's unified size can be offered
 * while one of its pieces has none left, and choosing it then sizes the other
 * pieces and leaves Add to bag disabled — so only a size every piece shows in
 * stock is chosen, and Add to bag is then required to be ready.
 */
export async function chooseBuyableSize(
  page: Page,
  gesture: SizeGesture = byKeyboard,
): Promise<string | null> {
  const [size] = await sizesPlainForEveryPiece(page);
  if (size === undefined) return null;

  const radio = wholeProductSizes(page).getByRole('radio', { name: size, exact: true });
  await gesture(radio);
  await expect(radio).toBeChecked();
  await expect(addToBagButton(page)).toBeEnabled();
  return size;
}

/** A plain size's name, which is its label and nothing else. */
async function sizeNameOf(radio: Locator): Promise<string> {
  const id = await radio.getAttribute('id');
  if (id === null) throw new Error('A size radio without an id has no label.');
  return (await radio.page().locator(`label[for="${id}"]`).innerText()).trim();
}

/**
 * The sizes of the whole product that every piece has with no stock note — the
 * sizes a saved size can be chosen in for the whole set at once.
 */
export async function sizesPlainForEveryPiece(page: Page): Promise<string[]> {
  const groups = await sizeGroups(page).count();
  const plain = wholeProductSizes(page).getByRole('radio', { name: PLAIN_SIZE, disabled: false });
  const names = await Promise.all((await plain.all()).map((radio) => sizeNameOf(radio)));

  const everywhere = await Promise.all(
    names.map(async (name) => {
      const offered = page
        .getByRole('main')
        .getByRole('radio', { name, exact: true, disabled: false });
      return (await offered.count()) === groups;
    }),
  );

  return names.filter((_, index) => everywhere[index] === true);
}

/** §34 — the fork under Add to bag into the studio, or `null` when the product is not cut to measure. */
export async function stitchingForkOf(page: Page): Promise<Locator | null> {
  const fork = page
    .getByRole('main')
    .getByRole('link', { name: startsWith(en.product.stitchingForkHeading) });
  return (await fork.count()) > 0 ? fork : null;
}

/** The product's code as its page prints it — what a customer types off a message. */
export async function productCodeOf(page: Page): Promise<string | null> {
  const line = page.getByRole('main').getByText(startsWith(en.product.codeLabel)).first();
  if ((await line.count()) === 0) return null;
  const code = (await line.innerText())
    .trim()
    .slice(en.product.codeLabel.length)
    .replace(/^[:\s]+/, '');
  return code.length > 0 ? code : null;
}

/** How many photographs the gallery offers, or `null` when there is only one to see. */
export async function galleryImageCount(page: Page): Promise<number | null> {
  const thumbnails = page
    .getByRole('main')
    .getByRole('list', { name: en.product.galleryLabel })
    .getByRole('button');
  const count = await thumbnails.count();
  return count > 1 ? count : null;
}

export interface NotifyChip {
  readonly chip: Locator;
  /** The sold-out size it asks about, as the selector names it. */
  readonly size: string;
}

/**
 * §28.2's Notify Me on the whole product: the first sold-out size it offers to
 * email about, or `null` when every size of the whole product can still be had.
 * The whole product's chips come first on the page, before any piece's.
 */
export async function wholeProductNotifyChip(page: Page): Promise<NotifyChip | null> {
  const soldOut = wholeProductSizes(page).getByRole('radio', { disabled: true });
  if ((await soldOut.count()) === 0) return null;
  const chip = page
    .getByRole('main')
    .getByRole('group', { name: en.backInStock.lead, exact: true })
    .first()
    .getByRole('button')
    .first();
  const name = await chip.getAttribute('aria-label');
  if (name === null) return null;
  return { chip, size: readPlaceholder(en.backInStock.sizeCta, name) };
}

/** A product page with a whole-product size selector — where the size guide sits. */
export async function sizedProduct(page: Page): Promise<Locator | null> {
  const sizes = wholeProductSizes(page);
  return (await sizes.count()) > 0 ? sizes : null;
}
