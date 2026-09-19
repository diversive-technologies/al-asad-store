import { z } from 'zod';

import type { Locale } from '@/i18n/locales';

import { buyableProductIds } from './availability-db';
import {
  CATALOGUE,
  toProductCard,
  type CatalogueRecord,
  type ProductCardPayload,
} from './catalogue-db';

/**
 * D1 — §28.2's "You may also like", standing in for Java's Search and Discovery.
 *
 * WHICH products relate to a product, and in what order, is decided HERE and
 * nowhere in the interface (DATA-13). The storefront sends the product and how
 * many its grid can hold; everything else is this side's answer. The rule is
 * FIXTURE — a sensible one that a real merchandising rule replaces without the
 * interface changing:
 *
 * 1. **Never the product itself**, and never the same garment in the same cloth
 *    and the same colour, which would be the product twice rather than a
 *    suggestion.
 * 2. **Closest first.** The same garment in the same colour but another cloth,
 *    then the same garment in another colour, then anything else of the same
 *    garment TYPE (stitched with stitched, unstitched with unstitched). A product
 *    of the other type is not related at all: somebody looking at a length of
 *    cloth is not shopping for a finished garment.
 * 3. **Sold-out last**, whatever its closeness — judged against the same live
 *    ledger every overlay reads (`availability-db.ts`), so a product whose last
 *    unit is in a bag moves behind everything that can still be bought.
 * 4. **Deterministic**: newest launch first, then product code, so one product
 *    shows the same suggestions in the same order every time.
 */

/** The most one request may ask for. A stand-in for Java trusts no caller's `limit`. */
export const RELATED_LIMIT_MAX = 24;

/** SEC-02 — the query, parsed rather than read: a malformed one is Java's 400. */
const relatedQuerySchema = z.object({
  productId: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(RELATED_LIMIT_MAX),
});

export type RelatedQuery = z.infer<typeof relatedQuerySchema>;

/** The query a related read was sent, or `null` for one Java would refuse. */
export function readRelatedQuery(url: URL): RelatedQuery | null {
  const parsed = relatedQuerySchema.safeParse({
    productId: url.searchParams.get('productId') ?? '',
    // Absent is refused, not defaulted: `z.coerce` reads '' as 0, which is below the minimum.
    limit: url.searchParams.get('limit') ?? '',
  });
  return parsed.success ? parsed.data : null;
}

/** Nearest first: 0 and 1 are the same garment, 2 the same garment type. `null` is unrelated. */
function closenessOf(candidate: CatalogueRecord, product: CatalogueRecord): number | null {
  if (candidate.id === product.id) return null;

  if (candidate.garment === product.garment) {
    const isSameCloth = candidate.fabric === product.fabric;
    const isSameColour = candidate.colour === product.colour;
    if (isSameCloth && isSameColour) return null;
    return isSameColour ? 0 : 1;
  }

  return candidate.garmentType === product.garmentType ? 2 : null;
}

interface Ranked {
  readonly record: CatalogueRecord;
  readonly closeness: number;
  readonly isSoldOut: boolean;
}

function byRank(a: Ranked, b: Ranked): number {
  return (
    Number(a.isSoldOut) - Number(b.isSoldOut) ||
    a.closeness - b.closeness ||
    Date.parse(b.record.launchedAt) - Date.parse(a.record.launchedAt) ||
    a.record.code.localeCompare(b.record.code)
  );
}

/**
 * The related records for one product, in the order to show them, at most `limit`.
 *
 * `buyableIds` is passed in rather than read here, so the rule can be judged
 * against a stock picture a test states — the handler passes the live one.
 */
export function relatedRecords(
  product: CatalogueRecord,
  buyableIds: ReadonlySet<string>,
  limit: number,
): readonly CatalogueRecord[] {
  return CATALOGUE.flatMap((record): Ranked[] => {
    const closeness = closenessOf(record, product);
    return closeness === null ? [] : [{ record, closeness, isSoldOut: !buyableIds.has(record.id) }];
  })
    .sort(byRank)
    .slice(0, limit)
    .map((entry) => entry.record);
}

/** §28.2 — the related products as cards, or `null` for a product the store does not hold. */
export function relatedProductsFor(
  query: RelatedQuery,
  locale: Locale,
): ProductCardPayload[] | null {
  const product = CATALOGUE.find((record) => record.id === query.productId);
  if (product === undefined) return null;

  return relatedRecords(product, buyableProductIds(), query.limit).map((record) =>
    toProductCard(record, locale),
  );
}
