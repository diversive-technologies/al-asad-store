import type { UseQueryOptions } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';

import type { BagSummary } from '../schemas/bag.schema';
import { fetchBag } from './bag-browser';

type BagKey = ReturnType<typeof queryKeys.bag.summary>;

/**
 * §16 `summary(cart)` as one query definition — its key, its read and when it is
 * read again — so the provider, the `/bag` page and the test that pins its
 * behaviour ask the same question.
 *
 * DATA-09 — `staleTime: 0`. A bag holds reservations that expire, and its prices
 * can change under a promotion; there is no interval over which a cached copy is
 * safe to show.
 *
 * `refetchOnWindowFocus: true`, overriding the client's default of `false`. The
 * provider is the query's one standing observer and never remounts, so with the
 * default the bag was read once per page load and never again: a customer who
 * browsed for half an hour kept a line in the header and the panel whose hold had
 * lapsed, and every change to it answered "please try again". Coming back to the
 * tab is exactly when a hold may have run out.
 */
export function bagSummaryQuery(): UseQueryOptions<BagSummary, Error, BagSummary, BagKey> {
  return {
    queryKey: queryKeys.bag.summary(),
    // DATA-03a: `unwrap` is the only sanctioned Result→throw adapter.
    queryFn: ({ signal }) => unwrap(fetchBag(signal)),
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
  };
}
