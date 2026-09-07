/**
 * THE column vocabulary for the product grid.
 *
 * A leaf module — it imports nothing project-internal, so the server resolver,
 * the client control and the CSS-facing constants can all depend on it without
 * a cycle (MOD-01).
 */

/**
 * Every column count the grid renders, at any width and under any preference.
 *
 * This list is load-bearing arithmetic rather than decoration. `DEFAULT_PAGE_SIZE`
 * must divide exactly by every entry, because a count it does not divide by ends
 * the page on a part-filled row while the next products sit on page 2 — a hole
 * in the grid with stock behind it. That is why 5 is absent: 24 / 5 is 4.8, so a
 * five-column layout showed four tiles in its last row at every page.
 *
 * `grid-columns.test.ts` asserts the division, so adding a count that does not
 * divide fails the suite rather than showing up as a gap on a wide monitor.
 *
 * `globals.css` MIRRORS this list in its media queries, because a media query
 * cannot be driven from TypeScript. Change one and change the other.
 */
export const GRID_COLUMN_COUNTS = [1, 2, 3, 4, 6] as const;

/**
 * What the small-screen switcher offers.
 *
 * Only small screens get a choice. On a desktop the column count is a function
 * of the available width — there is one right answer at each breakpoint and
 * offering a wrong one is not a feature. On a phone the trade is real: one
 * column is a browsing view with legible photography, three is a scanning view
 * for someone who knows what they are looking for.
 */
export const MOBILE_COLUMN_OPTIONS = [1, 2, 3] as const;

export type MobileColumns = (typeof MOBILE_COLUMN_OPTIONS)[number];

/** Two, which is what the grid renders with no preference stored. */
export const DEFAULT_MOBILE_COLUMNS: MobileColumns = 2;

export const GRID_COLUMNS_COOKIE = 'grid-columns';

/** The attribute the CSS keys off. Named once so markup and CSS agree. */
export const GRID_COLUMNS_ATTRIBUTE = 'data-grid-columns';

export function isMobileColumns(value: unknown): value is MobileColumns {
  return typeof value === 'number' && (MOBILE_COLUMN_OPTIONS as readonly number[]).includes(value);
}

/**
 * SEC-02 — a cookie is untrusted input. Anything that is not one of the offered
 * counts becomes the default rather than reaching the DOM, so a hand-edited
 * cookie cannot put an arbitrary string into an attribute selector.
 */
export function parseMobileColumns(value: string | undefined): MobileColumns {
  if (value === undefined) return DEFAULT_MOBILE_COLUMNS;

  const parsed = Number(value);
  return isMobileColumns(parsed) ? parsed : DEFAULT_MOBILE_COLUMNS;
}
