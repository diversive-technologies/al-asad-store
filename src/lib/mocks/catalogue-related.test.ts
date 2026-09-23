import { beforeEach, describe, expect, it } from 'vitest';

import { buyableProductIds } from './availability-db';
import { resetCarts } from './bag-db';
import { resetReservations } from './bag-reservations';
import { CATALOGUE, type CatalogueRecord } from './catalogue-db';
import {
  readRelatedQuery,
  RELATED_LIMIT_MAX,
  relatedProductsFor,
  relatedRecords,
} from './catalogue-related';
import type { GarmentKey } from './garment-kinds';
import { takeEveryUnitOf } from './stock-test-support';

/**
 * §28.2 "You may also like" — the RULE deciding which products relate, pinned.
 *
 * Under D1 the mock is the executable statement of what the storefront expects
 * from Java, so what is asserted here is the behaviour the section is built on:
 * never the product itself, closest first, sold-out last, deterministic, capped.
 * The rule's details are FIXTURE; the contract around them is not.
 */

/** The first product of a garment in catalogue order — newest first. */
function firstOf(garment: GarmentKey): CatalogueRecord {
  const record = CATALOGUE.find((entry) => entry.garment === garment);
  if (record === undefined) throw new Error(`The fixture holds no ${garment}.`);
  return record;
}

/** How many products the rule may draw on for `product`: its own garment type, less itself. */
function poolFor(product: CatalogueRecord): number {
  return CATALOGUE.filter(
    (record) => record.garmentType === product.garmentType && record.id !== product.id,
  ).length;
}

/** A stock picture in which everything can be bought. */
const EVERYTHING = new Set(CATALOGUE.map((record) => record.id));

function idsOf(records: readonly CatalogueRecord[]): string[] {
  return records.map((record) => record.id);
}

beforeEach(() => {
  resetCarts();
  resetReservations();
});

describe('which products relate', () => {
  it.each<GarmentKey>(['waistcoat', 'kameez', 'kurta'])(
    'never suggests a %s to itself',
    (garment) => {
      const product = firstOf(garment);

      expect(idsOf(relatedRecords(product, EVERYTHING, RELATED_LIMIT_MAX))).not.toContain(
        product.id,
      );
    },
  );

  it('never suggests the same garment in the same cloth and colour', () => {
    // A product on file under another id: garment, cloth and colour all match it.
    const twin = firstOf('kameez');
    const product = { ...twin, id: 'not-on-file', code: 'AA-9999' };

    expect(idsOf(relatedRecords(product, EVERYTHING, RELATED_LIMIT_MAX))).not.toContain(twin.id);
  });

  /*
   * `closenessOf` states the rule: "0 and 1 are the same garment, 2 the same
   * garment type". This used to be asserted as garment TYPE alone, which was
   * only ever true incidentally — every kind was sold one way, so the kind
   * decided the type. Since 2026-09-23 a kurta is sold both as a length and
   * ready-made, and a kameez both ways too, so the two clauses have come apart
   * and the assertion now names the rule rather than a coincidence.
   */
  it.each<GarmentKey>(['waistcoat', 'kameez', 'kurta'])(
    'keeps a %s to its own garment or its own garment type, never further',
    (garment) => {
      const product = firstOf(garment);
      const related = relatedRecords(product, EVERYTHING, RELATED_LIMIT_MAX);

      expect(related.length).toBeGreaterThan(0);
      expect(
        related.every(
          (record) =>
            record.garment === product.garment || record.garmentType === product.garmentType,
        ),
      ).toBe(true);
    },
  );
});

describe('the order they are shown in', () => {
  it('puts the same garment in the same colour but another cloth first', () => {
    // The fixture offers each garment in one cloth, so the nearest tier is pinned
    // with a product off file: the waistcoat on file is its other-cloth sibling.
    const onFile = firstOf('waistcoat');
    const product: CatalogueRecord = {
      ...onFile,
      id: 'not-on-file',
      code: 'AA-9999',
      fabric: onFile.fabric === 'cotton' ? 'boski' : 'cotton',
    };

    expect(relatedRecords(product, EVERYTHING, RELATED_LIMIT_MAX)[0]?.id).toBe(onFile.id);
  });

  it('then offers the same garment in another colour, newest first', () => {
    const product = firstOf('waistcoat');
    const related = relatedRecords(product, EVERYTHING, RELATED_LIMIT_MAX);
    const others = CATALOGUE.filter(
      (record) => record.garment === 'waistcoat' && record.colour !== product.colour,
    );

    expect(idsOf(related.slice(0, others.length))).toEqual(idsOf(others));
  });

  it('offers the other garments of the same type only after every one of its own', () => {
    const product = firstOf('kameez');
    const related = relatedRecords(product, EVERYTHING, RELATED_LIMIT_MAX);
    const ownCount = CATALOGUE.filter((record) => record.garment === 'kameez').length - 1;

    expect(related.slice(0, ownCount).every((record) => record.garment === 'kameez')).toBe(true);
    expect(related.slice(ownCount).every((record) => record.garment !== 'kameez')).toBe(true);
  });

  it('puts a sold-out product after every buyable one, however close it is', () => {
    const product = firstOf('kameez');
    const buyable = CATALOGUE.filter((record) => record.garment === 'waistcoat').slice(0, 2);
    const related = relatedRecords(product, new Set(idsOf(buyable)), RELATED_LIMIT_MAX);

    expect(idsOf(related.slice(0, 2))).toEqual(idsOf(buyable));
    expect(related[2]?.garment).toBe('kameez');
  });

  it('answers the same list in the same order every time', () => {
    const product = firstOf('kurta');

    expect(idsOf(relatedRecords(product, EVERYTHING, 12))).toEqual(
      idsOf(relatedRecords(product, EVERYTHING, 12)),
    );
  });

  it.each([1, 5, 12, RELATED_LIMIT_MAX])('holds no more than the %i asked for', (limit) => {
    const product = firstOf('waistcoat');

    expect(relatedRecords(product, EVERYTHING, limit)).toHaveLength(
      Math.min(limit, poolFor(product)),
    );
  });
});

describe('relatedProductsFor', () => {
  it('reads the LIVE ledger: a product whose last unit is held moves behind every buyable one', () => {
    const product = firstOf('waistcoat');
    const query = { productId: product.id, limit: RELATED_LIMIT_MAX };
    const before = relatedProductsFor(query, 'en')?.map((card) => card.id) ?? [];
    const nearest = CATALOGUE.find((record) => record.id === before[0]);
    if (nearest === undefined) throw new Error('The waistcoat has nothing related to it.');

    takeEveryUnitOf(nearest);
    const buyableNow = buyableProductIds();
    const after = relatedProductsFor(query, 'en')?.map((card) => card.id) ?? [];
    const buyableCount = after.filter((id) => buyableNow.has(id)).length;

    expect(buyableNow.has(nearest.id)).toBe(false);
    expect(after.slice(0, buyableCount).every((id) => buyableNow.has(id))).toBe(true);
    expect(after.slice(0, buyableCount)).not.toContain(nearest.id);
  });

  it('answers cards in the asked locale, as many as were asked for', () => {
    const cards = relatedProductsFor({ productId: firstOf('waistcoat').id, limit: 12 }, 'ur');

    expect(cards).toHaveLength(12);
    expect(cards?.every((card) => card.images.length > 0)).toBe(true);
  });

  it('answers null for a product the store does not hold', () => {
    expect(relatedProductsFor({ productId: 'no-such-product', limit: 12 }, 'en')).toBeNull();
  });
});

describe('readRelatedQuery', () => {
  const PRODUCT = CATALOGUE[0]?.id ?? '';

  it('reads a well-formed query', () => {
    const url = new URL(`http://mock/related?productId=${PRODUCT}&limit=12&locale=ur`);

    expect(readRelatedQuery(url)).toEqual({ productId: PRODUCT, limit: 12 });
  });

  it.each([
    ['no product', '?limit=12'],
    ['a blank product', '?productId=%20&limit=12'],
    ['no limit', `?productId=${PRODUCT}`],
    ['a limit of zero', `?productId=${PRODUCT}&limit=0`],
    ['a limit past the ceiling', `?productId=${PRODUCT}&limit=${String(RELATED_LIMIT_MAX + 1)}`],
    ['a fractional limit', `?productId=${PRODUCT}&limit=1.5`],
    ['a limit that is not a number', `?productId=${PRODUCT}&limit=twelve`],
  ])('refuses %s, as Java answers 400', (_, search) => {
    expect(readRelatedQuery(new URL(`http://mock/related${search}`))).toBeNull();
  });
});
