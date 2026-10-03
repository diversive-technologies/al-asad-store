import 'server-only';

/**
 * M-03 — the behaviour events the storefront reports, and the one shape Java
 * accepts them in (`POST /api/v1/events`, M-02).
 *
 * Java records `add_to_bag`, `order_placed` and `notify_me_requested` itself, from
 * the headers `visitorHeaders` forwards, because only Java knows the outcome. These
 * seven are the ones only this server can see.
 *
 * No event carries a name, an email, a mobile number, an address or an account key
 * (§3.4.3): an anonymous visitor id, a kind of device and what was looked at.
 */
export const EVENT_TYPES = [
  'page_view',
  'product_view',
  'search',
  'checkout_started',
  'try_on_started',
  'try_on_ready',
  'try_on_failed',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type Device = 'mobile' | 'tablet' | 'desktop';

/** What a caller says about one event; who and when are added by the recorder. */
export interface EventInput {
  readonly type: EventType;
  /** The address path. Any query string is dropped before it is sent. */
  readonly path: string;
  readonly productId?: string;
  /** The words searched for; Java cuts them to 80 characters. */
  readonly term?: string;
  readonly resultCount?: number;
  /** A short lowercase word (`[a-z][a-z0-9_]{0,31}`). */
  readonly outcome?: string;
}

/** One event as the backend accepts it. */
export interface BehaviourEvent extends EventInput {
  readonly at: string;
  readonly visitorId: string;
  readonly device: Device;
}

/** Java refuses a batch over this many events, whole. */
export const MAX_EVENTS_PER_BATCH = 20;

/** Java refuses a longer path. */
export const MAX_PATH_LENGTH = 200;
