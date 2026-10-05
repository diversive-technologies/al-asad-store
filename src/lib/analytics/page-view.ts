import 'server-only';

import { clientAddressHeader } from '@/lib/api/client-address';

import type { BehaviourEvent } from './events';
import { recordEvents, stampEvents } from './record-events';
import { deviceOf, isCountable } from './visitor';

/**
 * M-03 — the page view, counted where every page request passes: the proxy.
 *
 * A layout would miss it. The root layout renders on the first load and not again
 * while a customer moves between pages, so only the proxy sees every navigation —
 * a full load (asks for HTML) and a soft one (asks for the RSC payload) alike.
 *
 * Not counted: anything under `/api` or `/_next`, a non-GET, and everything
 * `isCountable` refuses (crawlers, prefetches, `HEAD`).
 */

export interface PageRequest {
  readonly method: string;
  readonly pathname: string;
  readonly headers: Pick<Headers, 'get'>;
}

function isPageNavigation(request: PageRequest): boolean {
  if (request.method.toUpperCase() !== 'GET') return false;
  if (request.pathname.startsWith('/api/') || request.pathname.startsWith('/_next/')) return false;

  const { headers } = request;
  return (headers.get('accept') ?? '').includes('text/html') || headers.get('rsc') === '1';
}

/** The event for this request, or `null` when it is not a person viewing a page. */
export function pageViewFor(request: PageRequest, visitorId: string): BehaviourEvent | null {
  if (!isPageNavigation(request) || !isCountable(request)) return null;

  const [event] = stampEvents([{ type: 'page_view', path: request.pathname }], {
    visitorId,
    device: deviceOf(request.headers.get('user-agent')),
  });
  return event ?? null;
}

/** What `after()` runs in the proxy: post the one event, with the customer's address. */
export function postPageView(
  event: BehaviourEvent,
  request: Pick<Request, 'headers'>,
): Promise<void> {
  return recordEvents([event], clientAddressHeader(request));
}
