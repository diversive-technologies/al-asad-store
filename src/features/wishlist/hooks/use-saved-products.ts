'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ProductCardWithAvailability } from '@/features/catalogue/contract';
import type { Locale } from '@/i18n/locales';
import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';

import { fetchSavedProducts } from '../api/fetch-saved-products';

/**
 * The saved products themselves — cards with their live availability — for the
 * ids on the account's list, in ONE request through `/api/products`, so a list of
 * twenty is not twenty round trips.
 *
 * `isReady` has to be true before this asks: the ids are read in an effect so the
 * server and client renders agree, and asking on the first render would ask for
 * nothing and cache the answer.
 *
 * The ids are the key, so every heart pressed and every move to the bag is a NEW
 * query. The previous answer is kept while it is asked (`keepPreviousData`), and
 * the screen shows it less whatever the list no longer holds — without that, the
 * whole grid gave way to "Loading…" each time one card left it.
 */
export function useSavedProducts(
  ids: readonly string[],
  locale: Locale,
  isReady: boolean,
): UseQueryResult<ProductCardWithAvailability[]> {
  return useQuery({
    queryKey: queryKeys.wishlist.products(ids, locale),
    queryFn: ({ signal }) => unwrap(fetchSavedProducts(ids, locale, signal)),
    enabled: isReady && ids.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    retry: false,
  });
}
