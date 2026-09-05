import 'server-only';

import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import type { Result } from '@/lib/result';

import {
  fabricVerdictSchema,
  type FabricQuery,
  type FabricVerdict,
} from '../schemas/fabric-calculator.schema';

/**
 * DATA-04 — architecture §25 `FabricCalculator.evaluate`.
 *
 * DATA-09 — caching intent: `revalidate: 0`. The verdict depends on the
 * product's metreage and on a requirement table the operator can retune, and a
 * customer who is told "comfortable" on stale data buys cloth that does not fit.
 * TanStack Query holds it briefly on the client instead, keyed on the three
 * inputs, which is where re-checking the same height actually happens.
 */
export function evaluateFabric(query: FabricQuery): Promise<Result<FabricVerdict, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.fabricCalculator.evaluate,
    schema: fabricVerdictSchema,
    searchParams: {
      productId: query.productId,
      heightCm: query.heightCm,
      styleId: query.styleId,
    },
    next: { revalidate: 0 },
  });
}
