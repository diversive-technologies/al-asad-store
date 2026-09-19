import { expect, type Page } from '@playwright/test';

/**
 * Nothing on the page is wider than the screen. A phone widens its layout to fit
 * an overflowing page, after which every fixed panel measures the wrong width too
 * — the product page was once 81px wider than every phone (PROGRESS, "Phone
 * layout"), and this is the check that would have caught it.
 */
export async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    screen: document.documentElement.clientWidth,
  }));
  expect(widths.screen).toBeGreaterThan(0);
  expect(widths.content).toBeLessThanOrEqual(widths.screen);
}

/** The document's language and direction, set once by the root layout (I18N-03). */
export async function expectDocumentLanguage(
  page: Page,
  lang: string,
  dir: 'ltr' | 'rtl',
): Promise<void> {
  const root = page.locator('html');
  await expect(root).toHaveAttribute('lang', lang);
  await expect(root).toHaveAttribute('dir', dir);
}
