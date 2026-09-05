import type { BagSummary } from '../schemas/bag.schema';

/**
 * MOD-04 — the bag a browser has when it has never added anything.
 *
 * This is NOT the frontend inventing a summary. It is the shape of "no cart
 * exists", which is a fact the BFF knows without asking Java: there is no
 * cookie, so there is nothing to ask about. Every number is zero because
 * nothing has been bought, not because a rule was applied here.
 *
 * `thresholdMinor` is the one field that would be a lie, so it is deliberately
 * NOT stated as a real threshold — an empty bag's progress bar has nothing to
 * show, and the interface hides it when `lines` is empty. `1` keeps the schema
 * satisfied (the real threshold is positive) without publishing a number the
 * frontend does not own.
 */
export const EMPTY_BAG: BagSummary = {
  lines: [],
  itemCount: 0,
  pricing: {
    subtotalMinor: 0,
    discountMinor: 0,
    deliveryMinor: 0,
    totalMinor: 0,
    appliedCode: null,
  },
  freeDelivery: { thresholdMinor: 1, remainingMinor: 0, isMet: false },
};
