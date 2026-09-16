/**
 * Request headers the BFF attaches on its way to Java. Protocol rather than
 * paths, so they sit beside the endpoint registry (SSOT-04) instead of in it.
 */
export const API_HEADERS = {
  /**
   * §34.4 `saveProfile(customer_id?, …)` — who a measurement profile belongs to,
   * attached by the BFF and never taken from the request body: `ACCOUNT:<id>` or
   * `DEVICE:<id>`.
   *
   * D3: the account id is the mock session's email until §11 issues a real
   * session; the BFF then forwards that session instead, and Java resolves the
   * customer from it.
   */
  measurementOwner: 'x-measurement-owner',
  /**
   * §28.3 — which ACCOUNT a saved item belongs to, attached by the BFF from the
   * session and never taken from the request body.
   *
   * Its own header rather than `measurementOwner`, because it carries a different
   * thing: a measurement profile can belong to a device as well as an account,
   * and a saved list only ever belongs to an account — a guest's stays in their
   * own browser. A header that could say `DEVICE:` here would be a shape the
   * store has no answer for.
   */
  accountKey: 'x-account-key',
} as const;
