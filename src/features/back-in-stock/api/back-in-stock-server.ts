import 'server-only';

import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { API_HEADERS } from '@/lib/api/headers';
import type { Result } from '@/lib/result';

import {
  backInStockOutcomeSchema,
  type BackInStockOutcome,
  type BackInStockRequest,
} from '../schemas/back-in-stock.schema';

export interface BackInStockAsker {
  /** The signed-in account, read from the SESSION by the caller; `null` for a guest. */
  readonly accountKey: string | null;
  /** The language the email is to be written in (§23). */
  readonly locale: Locale;
}

/**
 * DATA-04 — §28.2's Notify Me, sent to the backend.
 *
 * The account travels as a header and never in the body, so a request cannot
 * name somebody else's account to be written to. The locale travels as a query
 * parameter, as every localised call here does.
 *
 * DATA-09 — a write, so there is nothing to cache.
 */
export function requestBackInStock(
  request: BackInStockRequest,
  asker: BackInStockAsker,
): Promise<Result<BackInStockOutcome, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.backInStock.requests,
    method: 'POST',
    body: request,
    searchParams: { locale: asker.locale },
    headers: asker.accountKey === null ? {} : { [API_HEADERS.accountKey]: asker.accountKey },
    schema: backInStockOutcomeSchema,
    next: { revalidate: 0 },
  });
}

/**
 * The status our BFF answers for a request the backend did not take — the one
 * decision in the route, kept here where it is tested.
 *
 * - `VALIDATION` is the backend refusing the ADDRESS (its 422), the one thing the
 *   customer typed, so it is theirs to fix: a 400, which the browser reads as
 *   `INVALID` and puts back on the field (FORM-04). As a 502 it told them to try
 *   the same address again, for ever.
 * - `NOT_FOUND`: the store does not sell what the page named, so the page is out
 *   of date rather than broken.
 * - Anything else is ours, and is not described to them (ERR-11, SEC-07).
 */
export function backInStockFailureStatus(error: ApiError): 400 | 404 | 502 {
  if (error.kind === 'VALIDATION') return 400;
  if (error.kind === 'NOT_FOUND') return 404;
  return 502;
}
