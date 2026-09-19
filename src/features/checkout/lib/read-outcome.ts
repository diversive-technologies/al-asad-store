/**
 * What a response from one of checkout's own reads actually MEANS — the order
 * page's (§28.3) and the checkout quote's (§17).
 *
 * This exists as its own function because getting it wrong shipped twice.
 * `/order/[orderNumber]` treated every unsuccessful read as "no such order", so a
 * mock layer the page could not reach, a timeout and a response that failed its
 * schema all rendered as a 404 — a customer holding a receipt was told their
 * order did not exist. `/checkout` then made the same collapse the other way
 * round: an unreachable store was shown as "There is nothing to check out", which
 * tells somebody with a full bag that it is empty.
 *
 * The rule is one line long and now has a name and a test: 404 is ABSENCE,
 * every other unhappy answer is FAILURE, and the two are never the same thing.
 */
export type ReadOutcome =
  /**
   * The backend answered, and there is nothing here for THIS browser: no order
   * under that number it may see (§28.3 makes none-exists and not-yours one
   * answer), or no bag with anything in it to quote.
   */
  | 'ABSENT'
  /** The read itself did not complete, or came back unusable. */
  | 'FAILED'
  /** There is a body to validate. */
  | 'BODY';

/**
 * @param status The HTTP status, or `null` when the request never completed.
 */
export function classifyReadResponse(status: number | null): ReadOutcome {
  // A rejected fetch: DNS, connection refused, an aborted signal. Never absence.
  if (status === null) return 'FAILED';

  if (status === 404) return 'ABSENT';

  // 5xx especially: the store is broken, which is the opposite of a clean
  // answer that there is nothing there.
  if (status < 200 || status >= 300) return 'FAILED';

  return 'BODY';
}
