import { CATALOGUE_REVALIDATE_SECONDS } from '@/config/constants';
import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { ok, type Result } from '@/lib/result';

import { productCardSchema, type ProductCard } from '../schemas/product-card.schema';

/**
 * DATA-04 — section 15 `byCode(code) -> Product?`, the product-code lookup
 * behind the search box (section 28.1).
 *
 * The `?` in that signature is the whole point of this wrapper: a code that
 * matches nothing is an ORDINARY outcome, not a failure. The backend says so
 * with a 404, which `apiRequest` normalises into a NOT_FOUND error, so this
 * translates that one kind back into `ok(null)`.
 *
 * Every other error stays an error — a timeout is not "no such product", and
 * collapsing the two would show a customer "not found" when the store is simply
 * unreachable (ERR-03).
 */
export function findByCode(
  code: string,
  locale: Locale,
): Promise<Result<ProductCard | null, ApiError>> {
  const trimmed = code.trim();
  if (trimmed.length === 0) return Promise.resolve(ok(null));

  return apiRequest({
    path: ENDPOINTS.catalogue.byCode,
    schema: productCardSchema,
    searchParams: { code: trimmed, locale },
    next: { revalidate: CATALOGUE_REVALIDATE_SECONDS, tags: ['catalogue', `catalogue:${locale}`] },
  }).then((result) => {
    if (result.ok) return ok(result.value);
    if (result.error.kind === 'NOT_FOUND') return ok(null);
    return result;
  });
}
