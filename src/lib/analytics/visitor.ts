import 'server-only';

import type { Device } from './events';

/**
 * M-03 — who is asking, as far as the shop counts it: an anonymous visitor id,
 * the kind of device, and whether the request is one a person made.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** SEC-02 — a cookie is the browser's to write, so it is parsed, never trusted. */
export function parseVisitorId(value: string | null | undefined): string | null {
  return value !== null && value !== undefined && UUID.test(value) ? value : null;
}

export function newVisitorId(): string {
  return crypto.randomUUID();
}

/**
 * The kind of device, from the user agent. Coarse on purpose: three words are all a
 * count by device needs. An iPad that asks for the desktop site reads as a desktop.
 */
export function deviceOf(userAgent: string | null | undefined): Device {
  const agent = userAgent ?? '';
  if (/ipad|tablet|playbook|silk/i.test(agent)) return 'tablet';
  if (/android/i.test(agent) && !/mobile/i.test(agent)) return 'tablet';
  if (/mobi|iphone|ipod|windows phone|blackberry|opera mini/i.test(agent)) return 'mobile';
  return 'desktop';
}

/** Programs that announce themselves: search engines, link previews, monitors, tools. */
const AUTOMATED_AGENT =
  /bot\b|\bbot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|embedly|quora link|outbrain|pinterest|headlesschrome|lighthouse|pagespeed|pingdom|uptimerobot|statuscake|betteruptime|site24x7|vercel|curl\/|wget\/|python-requests|python-urllib|go-http-client|node-fetch|undici|axios|okhttp|java\//i;

/** A browser warming a link it has not been taken to yet. */
const PREFETCH_HEADERS = ['next-router-prefetch', 'x-middleware-prefetch'] as const;

export interface CountableRequest {
  readonly method: string;
  readonly headers: Pick<Headers, 'get'>;
}

/**
 * Whether a request is a person looking at the store. False for a `HEAD`, for a
 * prefetch (Next's own, or a browser's `Purpose: prefetch`) and for a known
 * automated agent — and for a request with no user agent at all, which is not a
 * browser.
 */
export function isCountable(request: CountableRequest): boolean {
  if (request.method.toUpperCase() === 'HEAD') return false;

  const { headers } = request;
  if (PREFETCH_HEADERS.some((name) => headers.get(name) !== null)) return false;
  if (/prefetch/i.test(headers.get('purpose') ?? '')) return false;
  if (/prefetch/i.test(headers.get('sec-purpose') ?? '')) return false;

  const agent = headers.get('user-agent');
  return agent !== null && agent.trim().length > 0 && !AUTOMATED_AGENT.test(agent);
}
