import type { Locale } from '@/i18n/locales';

import { CATALOGUE, type CatalogueRecord } from './catalogue-db';

/**
 * D1 — §12's collections, standing in for Catalogue: "Owns … collections", read
 * through `listByCollection(collection, paging)`.
 *
 * A collection is MERCHANDISING the operator decides (§21), not a filter a
 * customer composes, so its membership is declared here rather than derived in
 * the interface. Two exist, because two surfaces send a reader to one: the
 * homepage's New arrivals rail, and the search panel's best sellers. Each
 * surface's "View all" opens the collection its products were drawn from, so the
 * listing a reader lands on holds what they were just shown.
 *
 * FIXTURE membership, both: there are no delivered orders to rank best sellers
 * by, and no launch calendar to date arrivals by.
 */

interface CollectionRow {
  readonly slug: string;
  readonly name: Readonly<Record<Locale, string>>;
  readonly members: ReadonlySet<string>;
}

/** The newest launches, by `launchedAt` — as many as the homepage rail shows. */
const NEW_ARRIVALS_COUNT = 8;

/**
 * One of each photographed garment: the first time each of the fourteen
 * photographs appears in the fixture, in the cloth it was first offered in.
 */
const BEST_SELLERS_COUNT = 14;

function newestLaunches(count: number): ReadonlySet<string> {
  const newest = [...CATALOGUE].sort((a, b) => Date.parse(b.launchedAt) - Date.parse(a.launchedAt));
  return new Set(newest.slice(0, count).map((record) => record.id));
}

const COLLECTIONS: readonly CollectionRow[] = [
  {
    slug: 'new-arrivals',
    name: { en: 'New arrivals', ur: 'نئی آمد' },
    members: newestLaunches(NEW_ARRIVALS_COUNT),
  },
  {
    slug: 'best-sellers',
    name: { en: 'Best sellers', ur: 'مقبول ترین' },
    members: new Set(CATALOGUE.slice(0, BEST_SELLERS_COUNT).map((record) => record.id)),
  },
];

/** The collection the search panel merchandises before anything is typed. */
export const BEST_SELLERS_COLLECTION = 'best-sellers';

/** The collection the homepage's New arrivals rail is drawn from. */
export const NEW_ARRIVALS_COLLECTION = 'new-arrivals';

function collectionBySlug(slug: string): CollectionRow | undefined {
  return COLLECTIONS.find((collection) => collection.slug === slug);
}

/** Whether a record belongs to a collection. An unknown collection holds nothing. */
export function isInCollection(record: CatalogueRecord, slug: string): boolean {
  return collectionBySlug(slug)?.members.has(record.id) ?? false;
}

/** A collection's members in catalogue order — newest first, as the listing's default sort. */
export function collectionRecords(slug: string): readonly CatalogueRecord[] {
  return CATALOGUE.filter((record) => isInCollection(record, slug));
}

/** The collection as a result page names it, or `null` for one the catalogue does not hold. */
export function servedCollection(
  slug: string | null,
  locale: Locale,
): { slug: string; name: string } | null {
  const collection = slug === null ? undefined : collectionBySlug(slug);
  return collection === undefined ? null : { slug: collection.slug, name: collection.name[locale] };
}
