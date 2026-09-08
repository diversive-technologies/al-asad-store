import 'server-only';

import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import type { Result } from '@/lib/result';

import { tryOnOfferSchema, type TryOnOffer } from '../schemas/try-on.schema';

/**
 * DATA-04 — architecture §24 `isAvailable()`, plus the upload limits it states.
 *
 * DATA-09 — caching intent: `revalidate: 60`.
 *
 * This answers a question about CONFIGURATION, not about state: whether a
 * provider is connected at all. Caching it is what keeps the try-on off the
 * product page's latency budget — §30.1 gives that page 200ms, and an uncached
 * round trip on every render to learn a value that changes when the operator
 * edits a setting would spend a meaningful part of it.
 *
 * A minute, not an hour, because the interesting transition is switching the
 * provider ON: the operator connects the service and wants to see the button
 * appear, not to wonder for an hour whether the deployment took.
 */
export function fetchTryOnOffer(): Promise<Result<TryOnOffer, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.tryOn.offer,
    schema: tryOnOfferSchema,
    next: { revalidate: 60 },
  });
}
