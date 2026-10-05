import 'server-only';

import { cookies, headers as requestHeaders } from 'next/headers';
import { after } from 'next/server';

import { clientAddressHeader } from '@/lib/api/client-address';
import { API_HEADERS } from '@/lib/api/headers';
import { VISITOR_COOKIE_NAME } from '@/lib/utils/cookies';

import type { EventInput } from './events';
import { recordEvents, stampEvents } from './record-events';
import { deviceOf, isCountable, parseVisitorId } from './visitor';

/**
 * M-03 — how a render or a Route Handler reports what it showed.
 *
 * Everything runs on the SERVER and after the response: `after()` schedules the
 * post, so a page is never slower for being counted, and no analytics code is in
 * any browser bundle. A request that is not a person (a crawler, a prefetch, a
 * `HEAD`) or that carries no visitor id records nothing.
 *
 * Request data is read BEFORE `after()`, because a Server Component cannot read
 * `cookies()` or `headers()` inside the callback.
 */

type HeaderBag = Pick<Headers, 'get'>;

function who(headers: HeaderBag, visitorCookie: string | undefined, method: string) {
  if (!isCountable({ method, headers })) return null;
  const visitorId = parseVisitorId(visitorCookie);
  return visitorId === null ? null : { visitorId, device: deviceOf(headers.get('user-agent')) };
}

/** From a Server Component (a page or a feature screen it renders). */
export async function recordPageEvents(...inputs: readonly EventInput[]): Promise<void> {
  const [headers, jar] = await Promise.all([requestHeaders(), cookies()]);
  // A render does not know its method; a `HEAD` is already refused at the proxy.
  const caller = who(headers, jar.get(VISITOR_COOKIE_NAME)?.value, 'GET');
  if (caller === null) return;

  const events = stampEvents(inputs, caller);
  const forwarded = clientAddressHeader({ headers });
  after(() => recordEvents(events, forwarded));
}

/**
 * From a Server Component, for an event that depends on something this server has
 * to look up — whether the bag is empty, say. The look-up runs inside `after()`, so
 * it costs the page nothing; a look-up that fails or says no records nothing.
 */
export async function recordPageEventsIf(
  condition: () => Promise<boolean>,
  ...inputs: readonly EventInput[]
): Promise<void> {
  const [headers, jar] = await Promise.all([requestHeaders(), cookies()]);
  const caller = who(headers, jar.get(VISITOR_COOKIE_NAME)?.value, 'GET');
  if (caller === null) return;

  const events = stampEvents(inputs, caller);
  const forwarded = clientAddressHeader({ headers });
  after(async () => {
    const holds = await condition().catch(() => false);
    if (holds) await recordEvents(events, forwarded);
  });
}

/** From a Route Handler, which holds its `Request`. */
export async function recordRequestEvents(
  request: Request,
  ...inputs: readonly EventInput[]
): Promise<void> {
  const jar = await cookies();
  const caller = who(request.headers, jar.get(VISITOR_COOKIE_NAME)?.value, request.method);
  if (caller === null) return;

  const events = stampEvents(inputs, caller);
  const forwarded = clientAddressHeader(request);
  after(() => recordEvents(events, forwarded));
}

/** What Java needs to record add-to-bag, placement and Notify Me itself (M-02). */
export type VisitorHeaders = Readonly<Record<string, string>>;

/**
 * The headers a write forwards so that Java can attach the visitor to the event it
 * records. Empty for a request with no visitor; Java then records `visitorId: null`.
 * Not gated on `isCountable`: the write happened, whoever made it.
 */
export async function visitorHeaders(request: Pick<Request, 'headers'>): Promise<VisitorHeaders> {
  const jar = await cookies();
  const visitorId = parseVisitorId(jar.get(VISITOR_COOKIE_NAME)?.value);
  if (visitorId === null) return {};

  return {
    [API_HEADERS.visitorId]: visitorId,
    [API_HEADERS.visitorDevice]: deviceOf(request.headers.get('user-agent')),
  };
}
