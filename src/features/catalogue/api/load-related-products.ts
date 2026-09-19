import type { Locale } from '@/i18n/locales';
import type { ProductId } from '@/lib/domain/ids';
import { logApiError } from '@/lib/utils/log';

import { mergeAvailability, type ProductCardWithAvailability } from '../lib/product-card';
import { fetchRelatedProducts } from './fetch-related-products';
import { listingAvailabilities } from './listing-availability';

/**
 * §28.2 "You may also like", ready to draw: the related cards joined to the live
 * availability overlay (architecture 8.2). MOD-02 — the reads live here, so the
 * section that draws them only renders.
 *
 * An EMPTY list draws no section, and it stands for two different facts on
 * purpose, because the page treats them the same way:
 *
 * - **Nothing is related.** An ordinary answer, logged by nobody.
 * - **The read failed.** Logged HERE, once (ERR-10), and it costs the section
 *   rather than the page. The product page is the purchase path (§30.2) and a
 *   suggestion is not on it; nothing on the page says "nothing is related", so
 *   folding the failure into silence asserts nothing untrue.
 *
 * A failed OVERLAY is not a failed section: `listingAvailabilities` logs it and
 * every card reports its availability as unknown, exactly as a listing does.
 */
export async function loadRelatedProducts(
  productId: ProductId,
  locale: Locale,
): Promise<readonly ProductCardWithAvailability[]> {
  const related = await fetchRelatedProducts(productId, locale);

  if (!related.ok) {
    logApiError('product:related', related.error);
    return [];
  }

  // Needs the ids the first read answered, so it cannot run beside it (PERF-02).
  const availabilities = await listingAvailabilities(related.value, 'product:related:availability');
  return mergeAvailability(related.value, availabilities);
}
