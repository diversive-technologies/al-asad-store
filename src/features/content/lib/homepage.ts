import type { ProductId } from '@/lib/domain/ids';

import type { HomepageSection } from '../schemas/homepage.schema';

/**
 * MOD-04 — pure, React-free, unit-testable.
 *
 * Every product rail on the page needs live availability, but issuing one
 * request per rail would be a waterfall of small reads. Collecting the ids
 * first lets the page make a single overlay request for the whole homepage
 * (PERF-02), which is what architecture 8.2 intends by "a small, cheap, live
 * query".
 *
 * Ids are de-duplicated because the same product may legitimately appear in
 * more than one rail — a new arrival that is also in a featured collection.
 */
export function collectRailProductIds(sections: readonly HomepageSection[]): readonly ProductId[] {
  const ids = new Set<ProductId>();

  for (const section of sections) {
    if (section.kind !== 'PRODUCT_RAIL') continue;
    for (const product of section.products) ids.add(product.id);
  }

  return [...ids];
}
