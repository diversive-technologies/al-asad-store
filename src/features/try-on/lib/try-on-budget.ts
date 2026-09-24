/**
 * §24 — how many generations may be spent, and by whom.
 *
 * Every other write in this storefront costs a row. This one costs MONEY: each
 * generation is metered and billed by the image provider, and the route that
 * starts it is reachable by anyone who can load a product page. Same-origin
 * checking stops another site spending the budget; it does nothing about a
 * visitor holding the button down, or a script driving the store's own page.
 *
 * So there is a budget, and it has two ceilings because they answer different
 * threats:
 *
 * - **Per visitor** — an ordinary person trying four or five garments is using
 *   the feature; the same caller asking sixty times in an hour is not, whatever
 *   their intent, and the store would rather refuse than bill for it.
 * - **Per instance** — the ceiling that actually bounds a bill. A visitor limit
 *   alone is defeated by a caller who changes address; this one caps what the
 *   whole process will spend no matter how many visitors it thinks it has.
 *
 * Pure: the rules and the arithmetic, with no clock and no storage of their
 * own. `now` is passed in, which is what lets the window be tested without
 * waiting an hour.
 */

/** A window long enough to mean something, short enough to forgive a mistake. */
export const BUDGET_WINDOW_MS = 60 * 60 * 1000;

/**
 * What one visitor may spend in a window.
 *
 * Generous on purpose. Trying a garment, disliking the photograph, and trying
 * again with a better one is the ordinary way this feature is used, and a limit
 * that punished a real customer for being particular would cost more in sales
 * than it saved in generations.
 */
export const VISITOR_GENERATIONS_PER_WINDOW = 12;

/**
 * What the whole process may spend in a window.
 *
 * This is the number that bounds a surprise invoice, so it is the one to lower
 * if a deployment is public and unattended.
 */
export const INSTANCE_GENERATIONS_PER_WINDOW = 240;

/** The stamps still inside the window. Anything older has stopped counting. */
export function withinWindow(stamps: readonly number[], now: number): number[] {
  const floor = now - BUDGET_WINDOW_MS;
  return stamps.filter((stamp) => stamp > floor);
}

/** Whether a further generation would exceed `limit`, given what is on record. */
export function isExhausted(stamps: readonly number[], limit: number, now: number): boolean {
  return withinWindow(stamps, now).length >= limit;
}

/**
 * Why a generation was refused, or that it was allowed.
 *
 * The two refusals are kept apart because only one of them is about the
 * CUSTOMER. A visitor who has had their twelve is told they have been busy; a
 * store that has spent its own ceiling is not the customer's fault and is not
 * described to them as though it were (ERR-11).
 */
export type BudgetVerdict = 'ALLOWED' | 'VISITOR_EXHAUSTED' | 'INSTANCE_EXHAUSTED';
