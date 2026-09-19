import { expect, test, type Locator, type Page } from '@playwright/test';

import { CLIENT } from '@/config/client';
import { ROUTES } from '@/config/routes';
import { DEFAULT_PAGE_SIZE } from '@/features/catalogue/lib/search-options';
import { en } from '@/i18n/messages/en';
import { formatMoneyMinor, formatNumber, formatTemplate } from '@/lib/utils/format';

import {
  listedTotal,
  listingCards,
  listingStatus,
  listingStatusText,
  openCatalogue,
  pagesFor,
} from './support/catalogue';
import { escapeRegExp, startsWith } from './support/copy';
import { ARRIVAL } from './support/server';

/**
 * §28.1 — the listing's state lives in the address: a filter, a sort and a page
 * are each a URL, so a filtered view can be shared and Back undoes it. Every
 * change is also said aloud by the listing's polite status (§30.3).
 */
test.describe('the catalogue listing', () => {
  test('a filter and a sort narrow and order the results, and the address carries both', async ({
    page,
  }) => {
    await openCatalogue(page);
    const total = await listedTotal(page);

    // The first value of the first facet, with the count the panel promises for it.
    await page
      .getByRole('main')
      .getByRole('button', { name: startsWith(en.catalogue.filtersHeading) })
      .click();
    const drawer = page.getByRole('dialog', { name: en.catalogue.filtersHeading });
    const facetLink = drawer.getByRole('link', { name: facetLinkName() }).first();
    const [, label = '', count = ''] =
      facetLinkName().exec(await accessibleNameOf(facetLink)) ?? [];
    const narrowed = Number(count);
    expect(narrowed).toBeGreaterThan(0);
    expect(narrowed).toBeLessThan(total);

    await facetLink.click();
    await expect(page).toHaveURL((url) => url.searchParams.size === 1, ARRIVAL);
    // The drawer stays open for a second choice; the customer closes it to read the results.
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    const filterUrl = new URL(page.url());
    await expect(listingStatus(page)).toHaveText(
      listingStatusText({
        total: narrowed,
        sort: en.catalogue.sort.NEWEST,
        page: 1,
        filters: [label],
      }),
    );
    await expect(listingCards(page)).toHaveCount(Math.min(narrowed, DEFAULT_PAGE_SIZE));
    const chip = page
      .getByRole('list', { name: en.catalogue.activeFiltersLabel })
      .getByRole('link', { name: formatTemplate(en.catalogue.removeFilter, { label }) });
    await expect(chip).toBeVisible();

    // Sorting keeps the filter, and the prices then climb.
    await page
      .getByRole('main')
      .getByRole('button', { name: startsWith(en.catalogue.sort.label) })
      .click();
    await page
      .getByRole('navigation', { name: en.catalogue.sort.label })
      .getByRole('link', { name: en.catalogue.sort.PRICE_ASC, exact: true })
      .click();
    await expect(page).toHaveURL((url) => url.searchParams.get('sort') === 'PRICE_ASC', ARRIVAL);
    expect(sameFilters(new URL(page.url()), filterUrl)).toBe(true);
    await expect(listingStatus(page)).toHaveText(
      listingStatusText({
        total: narrowed,
        sort: en.catalogue.sort.PRICE_ASC,
        page: 1,
        filters: [label],
      }),
    );
    const prices = await cardPrices(page);
    expect(prices).toEqual([...prices].sort((first, second) => first - second));

    // Removing the chip takes the filter out of the address and keeps the order.
    await chip.click();
    await expect(page).toHaveURL((url) => url.search === '?sort=PRICE_ASC', ARRIVAL);
    await expect(listingStatus(page)).toHaveText(
      listingStatusText({ total, sort: en.catalogue.sort.PRICE_ASC, page: 1, filters: [] }),
    );
  });

  test('pages follow the address, and an address past the last page shows the last page', async ({
    page,
  }) => {
    await openCatalogue(page);
    const total = await listedTotal(page);
    const pages = pagesFor(total);

    await expect(listingStatus(page)).toHaveText(
      listingStatusText({ total, sort: en.catalogue.sort.NEWEST, page: 1, filters: [] }),
    );
    // Pagination is drawn exactly when there is somewhere to page to.
    await expect(page.getByRole('navigation', { name: en.catalogue.paginationLabel })).toHaveCount(
      Math.min(1, pages - 1),
    );

    // A shared link can outlive the stock it listed; it lands on the last page there is.
    const beyond = new URLSearchParams({ page: String(pages + 3) });
    await page.goto(`${ROUTES.catalogue.list}?${beyond.toString()}`);
    await expect(listingStatus(page)).toHaveText(
      listingStatusText({ total, sort: en.catalogue.sort.NEWEST, page: pages, filters: [] }),
    );
    await expect(listingCards(page)).toHaveCount(total - (pages - 1) * DEFAULT_PAGE_SIZE);
  });
});

/** A facet link's name: the value, the words "Apply this filter", then its count. */
function facetLinkName(): RegExp {
  return new RegExp(`^(.+) ${escapeRegExp(en.catalogue.filterAdd)} (\\d+)$`);
}

/** A link's name as read out: its visible and its visually hidden words, spaced. */
async function accessibleNameOf(link: Locator): Promise<string> {
  return (await link.innerText()).replace(/\s+/g, ' ').trim();
}

/** Every query parameter other than the sort, which is what a sort must leave alone. */
function sameFilters(after: URL, before: URL): boolean {
  const strip = (url: URL): string => {
    const params = new URLSearchParams(url.search);
    params.delete('sort');
    params.sort();
    return params.toString();
  };
  return strip(after) === strip(before);
}

/**
 * A price as a card writes it, whatever its digits — read off the store's own
 * money format (`formatMoneyMinor`) rather than written here, so a currency, a
 * symbol or a grouping the client configures (D5) moves this with it.
 */
function pricePattern(): RegExp {
  const major = 1_234_567;
  const sample = formatMoneyMinor(major * CLIENT.market.currency.minorUnitsPerMajor, 'en');
  const digits = formatNumber(major, 'en');
  const grouping = escapeRegExp([...new Set(digits.replace(/\d/g, ''))].join(''));
  // Whatever space the formatter puts beside the symbol, the page may render another.
  const [before = '', after = ''] = sample
    .split(digits)
    .map((part) => escapeRegExp(part).replace(/\s+/g, '\\s?'));
  return new RegExp(`^${before}[\\d${grouping}]+${after}$`);
}

/** Each card's current price, in major units, in the order the listing shows them. */
async function cardPrices(page: Page): Promise<number[]> {
  const cards = await listingCards(page).all();
  const price = pricePattern();
  const texts = await Promise.all(cards.map((card) => card.getByText(price).first().innerText()));
  return texts.map((text) => Number(text.replace(/\D/g, '')));
}
