import 'server-only';

import { TRY_ON_REQUEST_TIMEOUT_MS } from '@/config/constants';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import type { ProductId } from '@/lib/domain/ids';
import type { Result } from '@/lib/result';

import { tryOnResultSchema, type TryOnResult } from '../schemas/try-on.schema';

/**
 * DATA-04 — architecture §24 `generate(product_id, colour_id, photo)`.
 *
 * The photograph travels as multipart rather than as base64 inside JSON, and
 * that is a real difference rather than a preference: base64 inflates a 6MB
 * photograph to 8MB on the wire and holds the whole of it in memory as a string
 * on both sides. `apiRequest` passes a `FormData` body straight through for
 * exactly this.
 *
 * DATA-09 — caching intent: `revalidate: 0`, and it could not be otherwise. The
 * request carries a photograph and the response is an image of a person; there
 * is nothing here a cache could correctly serve to a second request, and §24
 * forbids retaining either end of it.
 *
 * The timeout is the one call in this codebase that overrides the global
 * budget — see `TRY_ON_REQUEST_TIMEOUT_MS` for why it sits above the backend's
 * own limit rather than below it.
 */
export function generateTryOn(
  productId: ProductId,
  photo: File,
): Promise<Result<TryOnResult, ApiError>> {
  const body = new FormData();
  body.set('productId', productId);
  body.set('photo', photo);

  return apiRequest({
    path: ENDPOINTS.tryOn.generate,
    schema: tryOnResultSchema,
    method: 'POST',
    body,
    timeoutMs: TRY_ON_REQUEST_TIMEOUT_MS,
    next: { revalidate: 0 },
  });
}
