import 'server-only';

import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { API_HEADERS } from '@/lib/api/headers';
import type { SizeId } from '@/lib/domain/ids';
import type { Result } from '@/lib/result';

import { savedSizesSchema, type SavedSizes } from '../schemas/saved-size.schema';

/**
 * §28.3's saved sizes, for whoever is signed in.
 *
 * The account is read from the SESSION by the caller and attached as a header,
 * never taken from the request the browser sent: a list that named its own owner
 * would let any browser read or rewrite any customer's sizes.
 *
 * DATA-09 — uncacheable, and not only because it is per-customer: the owner
 * travels in a header and Next's data cache is keyed on the request, so a cached
 * entry would be shared between customers.
 */
export function fetchSavedSizes(
  accountKey: string,
  locale: Locale,
): Promise<Result<SavedSizes, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.account.savedSizes,
    headers: { [API_HEADERS.accountKey]: accountKey },
    searchParams: { locale },
    schema: savedSizesSchema,
    next: { revalidate: 0 },
  });
}

/**
 * Remembers one size. Which size set it supersedes is the backend's to work out
 * from the id (DATA-13), and a save is a new record rather than an update (D6).
 */
export function rememberSize(
  accountKey: string,
  sizeId: SizeId,
  locale: Locale,
): Promise<Result<SavedSizes, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.account.savedSizes,
    method: 'POST',
    body: { sizeId },
    headers: { [API_HEADERS.accountKey]: accountKey },
    searchParams: { locale },
    schema: savedSizesSchema,
    next: { revalidate: 0 },
  });
}

/** D6 — records that the customer asked us to forget a size; nothing is destroyed. */
export function forgetSize(
  accountKey: string,
  sizeId: SizeId,
  locale: Locale,
): Promise<Result<SavedSizes, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.account.savedSizeRemoval,
    method: 'POST',
    body: { sizeId },
    headers: { [API_HEADERS.accountKey]: accountKey },
    searchParams: { locale },
    schema: savedSizesSchema,
    next: { revalidate: 0 },
  });
}
