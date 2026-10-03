import 'server-only';

import { z } from 'zod';

import { apiRequest } from './client';
import { ENDPOINTS } from './endpoints';

/**
 * F-08 — whether the Java service can answer, for `/api/health`.
 *
 * Java's own check is a one-second database round trip behind the same Access
 * filter as everything else, so an UP here means the storefront's credentials
 * work, the tunnel is up and the database answers — which is what an uptime
 * monitor polling the storefront wants to know.
 */

/** Longer than Java's own one-second check, short enough for a monitor's own timeout. */
export const HEALTH_TIMEOUT_MS = 3000;

export type BackendHealth = 'UP' | 'DOWN';

const healthSchema = z.object({ status: z.literal('UP') });

/**
 * `UP` only for a `200 {"status":"UP"}`. Everything else — Java's own 503, a
 * refused Access token, a timeout, a body that is not the contract — is `DOWN`,
 * and none of it is logged: a monitor polling every minute through a long outage
 * would otherwise fill the error tracker with one line per poll, and the monitor
 * is what pages somebody.
 */
export async function checkBackendHealth(): Promise<BackendHealth> {
  const result = await apiRequest({
    path: ENDPOINTS.health,
    schema: healthSchema,
    timeoutMs: HEALTH_TIMEOUT_MS,
    // DATA-09: a liveness answer is only worth anything if it is fresh.
    next: { revalidate: 0 },
  });

  return result.ok ? 'UP' : 'DOWN';
}
