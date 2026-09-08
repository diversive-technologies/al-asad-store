/**
 * What a response to §28.3's order read actually MEANS.
 *
 * This exists as its own function because getting it wrong is the defect that
 * shipped: `/order/[orderNumber]` treated every unsuccessful read as "no such
 * order", so a mock layer the page could not reach, a timeout and a response
 * that failed its schema all rendered as a 404 — under a tab still titled
 * "Order confirmed". A customer holding a receipt was told their order did not
 * exist, and the real failure was invisible to whoever went looking.
 *
 * The rule is one line long and now has a name and a test: 404 is ABSENCE,
 * every other unhappy answer is FAILURE, and the two are never the same thing.
 */
export type OrderReadOutcome =
  /** The backend answered, and no order has this number. */
  | 'ABSENT'
  /** The read itself did not complete, or came back unusable. */
  | 'FAILED'
  /** There is a body to validate. */
  | 'BODY';

/**
 * @param status The HTTP status, or `null` when the request never completed.
 */
export function classifyOrderResponse(status: number | null): OrderReadOutcome {
  // A rejected fetch: DNS, connection refused, an aborted signal. Never absence.
  if (status === null) return 'FAILED';

  if (status === 404) return 'ABSENT';

  // 5xx especially: the store is broken, which is the opposite of a clean
  // answer that the order is not there.
  if (status < 200 || status >= 300) return 'FAILED';

  return 'BODY';
}
