import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import type { Result } from '@/lib/result';

import { healthSchema, type Health } from '../schemas/health.schema';

/**
 * DATA-04 — a feature API module is a thin, typed wrapper over the client, one
 * function per operation.
 */
export function fetchHealth(): Promise<Result<Health, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.system.health,
    schema: healthSchema,
    // DATA-09: liveness is never cached — a cached "reachable" is worthless.
    next: { revalidate: 0 },
  });
}
