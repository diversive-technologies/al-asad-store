import { logApiError } from '@/lib/utils/log';

import type { ProductAvailability } from '../schemas/availability.schema';
import type { ProductCard } from '../schemas/product-card.schema';
import { fetchAvailability } from './fetch-availability';

/**
 * The live availability overlay (§8.2) for a page of listed products, read once
 * for both listings — `/catalogue` and `/search` — so they degrade identically.
 *
 * §30.2: a degraded dependency costs the stock badges, not the page. A failed
 * read is logged here, at the boundary that absorbs it (ERR-10), and every card
 * then reports its availability as unknown rather than guessing (DATA-13a).
 */
export async function listingAvailabilities(
  products: readonly ProductCard[],
  context: string,
): Promise<readonly ProductAvailability[]> {
  const availability = await fetchAvailability(products.map((product) => product.id));
  if (availability.ok) return availability.value;

  logApiError(context, availability.error);
  return [];
}
