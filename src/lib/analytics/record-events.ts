import 'server-only';

import { z } from 'zod';

import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

import {
  MAX_EVENTS_PER_BATCH,
  MAX_PATH_LENGTH,
  type BehaviourEvent,
  type Device,
  type EventInput,
} from './events';

/**
 * M-03 — how long this server waits for Java's `202`. A count is not worth a held
 * connection, and it runs after the page has gone, so the budget is short.
 */
export const EVENTS_TIMEOUT_MS = 2000;

/** The path as an event states it: no query string, no fragment, at most 200 characters. */
export function eventPath(path: string): string {
  const bare = path.split(/[?#]/, 1)[0] ?? '';
  return (bare.length > 0 ? bare : '/').slice(0, MAX_PATH_LENGTH);
}

/** Stamps who and when onto what a caller reported. */
export function stampEvents(
  inputs: readonly EventInput[],
  who: { readonly visitorId: string; readonly device: Device },
  now: Date = new Date(),
): BehaviourEvent[] {
  return inputs.map((input) => ({
    ...input,
    path: eventPath(input.path),
    at: now.toISOString(),
    visitorId: who.visitorId,
    device: who.device,
  }));
}

export interface RecordOptions {
  readonly timeoutMs?: number;
}

/**
 * Posts a batch of behaviour events to Java and swallows every failure.
 *
 * It is only ever called from `after()` or a proxy's `after()`, so the response
 * has already gone and nothing waits on it. It still never throws and never waits
 * longer than `EVENTS_TIMEOUT_MS`: a Java that is slow, down or refusing costs one
 * log line and some events (MongoDB being down loses events by design, DA-3).
 *
 * The line carries the failure's kind and nothing else, and does not go to the
 * error tracker: a Java outage would otherwise report once per page view.
 *
 * `headers` are the caller's own — the customer's address (`x-client-ip`), which
 * Java rate-limits events by (A-03).
 */
export async function recordEvents(
  events: readonly BehaviourEvent[],
  headers: Readonly<Record<string, string>> = {},
  options: RecordOptions = {},
): Promise<void> {
  if (events.length === 0) return;

  try {
    const result = await apiRequest({
      path: ENDPOINTS.analytics.events,
      method: 'POST',
      body: { events: events.slice(0, MAX_EVENTS_PER_BATCH) },
      headers,
      schema: z.null(),
      timeoutMs: options.timeoutMs ?? EVENTS_TIMEOUT_MS,
      // DATA-09: a write; there is nothing to cache.
      next: { revalidate: 0 },
    });
    if (!result.ok) console.warn(`[analytics] events not recorded: ${result.error.kind}`);
  } catch {
    // apiRequest returns a Result and does not throw; this is the belt to that braces.
    console.warn('[analytics] events not recorded: UNEXPECTED');
  }
}
