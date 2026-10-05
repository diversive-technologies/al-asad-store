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
   * D3: the account id is the session's email until §11 issues a real
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
  /**
   * §28.3 — a capability to read ONE order, issued by the backend at placement
   * or after the order's mobile number was proved. The BFF keeps it in an
   * httpOnly cookie and attaches it here; the browser never sees it.
   */
  orderAccess: 'x-order-access',
  /**
   * F-02 — Cloudflare Access service-token credentials. Java sits behind Access
   * and admits only this server (TD-1); `client.ts` attaches both to every call
   * when they are configured. Never logged.
   */
  accessClientId: 'CF-Access-Client-Id',
  accessClientSecret: 'CF-Access-Client-Secret',
  /**
   * F-02 — the customer's own address, taken from the request this server is
   * answering. Java rate-limits by it (A-03) and records it on security events
   * (A-02); it is trustworthy there only because Access admits no one but this
   * server. Attached only to the calls behind a limit, never to cached reads —
   * a per-visitor header would make them uncacheable.
   */
  clientAddress: 'x-client-ip',
  /** F-02 — one random id per call, so a Java log line can be matched to ours. */
  requestId: 'x-request-id',
  /**
   * M-03 — the anonymous visitor (a random UUID from the `aa_visitor` cookie) and
   * the kind of device, forwarded on the three writes Java records an event for
   * itself: a bag add, an order placement and a Notify Me request. Neither names a
   * person; the BFF reads them from its own cookie and user agent.
   */
  visitorId: 'x-visitor-id',
  visitorDevice: 'x-visitor-device',
} as const;
