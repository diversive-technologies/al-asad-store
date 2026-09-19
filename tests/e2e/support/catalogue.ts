import { expect, type Locator, type Page } from '@playwright/test';

import { ROUTES } from '@/config/routes';
import { DEFAULT_PAGE_SIZE } from '@/features/catalogue/lib/search-options';
import { en } from '@/i18n/messages/en';
import { formatList, formatNumber, formatPlural, formatTemplate } from '@/lib/utils/format';

import { messagePattern, readPlaceholder } from './copy';
import {
  byKeyboard,
  chooseBuyableSize,
  productNameOf,
  sizesPlainForEveryPiece,
  type SizeGesture,
} from './product';
import { ARRIVAL } from './server';

/*
 * The fixture catalogue is data, and it changes: products are found by what the
 * page SAYS about them — a size that can be bought, a photograph count, a fork —
 * never by a slug or a product code written into a test.
 */

/** The product cards of the listing the page is showing. */
export function listingCards(page: Page): Locator {
  return page.getByRole('main').getByRole('article');
}

export interface FoundProduct<T> {
  /** The product page's own address. */
  readonly address: string;
  /** The product's name, as its page heads itself. */
  readonly name: string;
  /** What `find` answered on this product's page. */
  readonly found: T;
}

/**
 * From the listing the page is on, opens the first product on which `find`
 * answers something — card by card, as a shopper would, clicking in and coming
 * back — and stays on that page.
 *
 * It fails, naming `wanted`, when no card does: the fixture no longer offers
 * what the journey is about, which is worth a failure rather than a silent skip.
 */
export async function openProductWhere<T>(
  page: Page,
  wanted: string,
  find: (page: Page) => Promise<T | null>,
): Promise<FoundProduct<T>> {
  const listing = page.url();
  const cards = await listingCards(page).count();

  for (let index = 0; index < cards; index += 1) {
    const { address, name } = await openCard(page, index);
    const found = await find(page);
    if (found !== null) return { address, name, found };
    await returnToListing(page, listing);
  }

  throw new Error(`No product on this listing ${wanted}.`);
}

/**
 * Clicks the card at `index` and waits until its product page has ARRIVED —
 * the address has changed and the product's own heading is up. Reading the page
 * any earlier reads the listing still on screen while the product loads, whose
 * heading is "Catalogue".
 */
export async function openCard(
  page: Page,
  index: number,
): Promise<{ address: string; name: string }> {
  const link = listingCards(page).nth(index).getByRole('link');
  const address = await link.getAttribute('href');
  if (address === null) throw new Error(`Card ${String(index)} links nowhere.`);

  await link.click();
  await expect(page).toHaveURL((url) => url.pathname === address, ARRIVAL);
  const heading = page.getByRole('main').getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible(ARRIVAL);
  return { address, name: await productNameOf(page) };
}

/** Back to the listing a card was opened from, and waits until its cards are up again. */
async function returnToListing(page: Page, listing: string): Promise<void> {
  await page.goBack();
  await expect(page).toHaveURL(listing, ARRIVAL);
  await expect(listingCards(page).first()).toBeVisible(ARRIVAL);
}

/**
 * From the listing the page is on, opens the first product that can be bought
 * and leaves a size chosen — `found` is its name — so Add to bag is ready.
 */
export function openBuyableProduct(
  page: Page,
  gesture: SizeGesture = byKeyboard,
): Promise<FoundProduct<string>> {
  return openProductWhere(page, 'can be bought in a plain size', (opened) =>
    chooseBuyableSize(opened, gesture),
  );
}

/** The whole catalogue, from its own address. */
export async function openCatalogue(page: Page): Promise<void> {
  await page.goto(ROUTES.catalogue.list);
  await expect(listingCards(page).first()).toBeVisible(ARRIVAL);
}

/** How many products the listing says it holds, read from its own count. */
export async function listedTotal(page: Page): Promise<number> {
  const { one, other } = en.catalogue.productCount;
  const main = page.getByRole('main');
  const count = main
    .getByText(messagePattern(other))
    .or(main.getByText(messagePattern(one)))
    .first();
  const words = (await count.innerText()).trim();
  const template = messagePattern(other).test(words) ? other : one;
  return Number(readPlaceholder(template, words).replace(/\D/g, ''));
}

/** §30.3's polite summary of the listing, read after every change to it. */
export function listingStatus(page: Page): Locator {
  return page
    .getByRole('main')
    .getByRole('status')
    .filter({ hasText: messagePattern(en.catalogue.listingStatus) })
    .or(
      page
        .getByRole('main')
        .getByRole('status')
        .filter({ hasText: messagePattern(en.catalogue.listingStatusFiltered) }),
    );
}

export interface ListingState {
  readonly total: number;
  readonly sort: string;
  readonly page: number;
  /** The applied filters as their chips name them; empty for none. */
  readonly filters: readonly string[];
}

/** How many pages a listing of `total` products takes. */
export function pagesFor(total: number): number {
  return Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));
}

/** The words `listingStatus` should read for a listing in `state`. */
export function listingStatusText(state: ListingState): string {
  const values = {
    products: formatPlural(en.catalogue.productCount, state.total, 'en'),
    filters: formatList(state.filters, 'en'),
    sort: state.sort,
    page: formatNumber(state.page, 'en'),
    pages: formatNumber(pagesFor(state.total), 'en'),
  };
  return formatTemplate(
    state.filters.length === 0 ? en.catalogue.listingStatus : en.catalogue.listingStatusFiltered,
    values,
  );
}

export interface SharedSize {
  readonly first: string;
  readonly second: string;
  /** A size both products have for every piece, with no stock note. */
  readonly size: string;
}

/**
 * From the whole catalogue, the first two products that share a size every one
 * of their pieces has in stock — so a size saved on one can be chosen for the
 * whole of the other (§28.3). Found by reading each page, never assumed.
 */
export async function productsSharingASize(page: Page): Promise<SharedSize> {
  await openCatalogue(page);
  const listing = page.url();
  const firstWith = new Map<string, string>();
  const cards = await listingCards(page).count();

  for (let index = 0; index < cards; index += 1) {
    const { address } = await openCard(page, index);

    for (const size of await sizesPlainForEveryPiece(page)) {
      const earlier = firstWith.get(size);
      if (earlier !== undefined && earlier !== address) {
        return { first: earlier, second: address, size };
      }
      firstWith.set(size, address);
    }

    await returnToListing(page, listing);
  }

  throw new Error('No two products in the catalogue share a size every piece has in stock.');
}
