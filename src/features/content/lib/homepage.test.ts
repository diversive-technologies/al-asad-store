import { describe, expect, it } from 'vitest';

import { homepageFor } from '@/lib/mocks/db';

import {
  homepageSchema,
  type HomepageSection,
  type ProductRailSection,
} from '../schemas/homepage.schema';
import { collectRailProductIds } from './homepage';

/*
 * PERF-02 / architecture 8.2: the homepage asks for live availability ONCE, for
 * every product any rail shows. These run against the served homepage, parsed
 * through the real contract, so the sections are the shapes the page is handed.
 */
const SERVED = homepageSchema.parse(homepageFor('en')).sections;

function onlyRail(sections: readonly HomepageSection[]): ProductRailSection {
  const rails = sections.filter(
    (section): section is ProductRailSection => section.kind === 'PRODUCT_RAIL',
  );
  const [rail, ...others] = rails;
  if (rail === undefined || others.length > 0) {
    throw new Error(`expected the served homepage to hold one rail, found ${rails.length}`);
  }
  return rail;
}

const RAIL = onlyRail(SERVED);
const [FIRST, SECOND, THIRD] = RAIL.products;
if (FIRST === undefined || SECOND === undefined || THIRD === undefined) {
  throw new Error('expected the served rail to show at least three products');
}

describe('the products the homepage asks availability for', () => {
  it('names every product the served rail shows, in the order it shows them', () => {
    expect(collectRailProductIds(SERVED)).toEqual(RAIL.products.map((product) => product.id));
  });

  it('asks once for a product that appears in two rails', () => {
    const featured: ProductRailSection = {
      ...RAIL,
      id: 'featured',
      products: [THIRD, FIRST, SECOND],
    };

    expect(collectRailProductIds([RAIL, featured])).toEqual(
      RAIL.products.map((product) => product.id),
    );
  });

  it('keeps the order products are first met in, across rails', () => {
    const first: ProductRailSection = { ...RAIL, id: 'first', products: [SECOND] };
    const second: ProductRailSection = { ...RAIL, id: 'second', products: [THIRD, SECOND, FIRST] };

    expect(collectRailProductIds([first, second])).toEqual([SECOND.id, THIRD.id, FIRST.id]);
  });

  it('asks for nothing when no section is a product rail', () => {
    const withoutRails = SERVED.filter((section) => section.kind !== 'PRODUCT_RAIL');

    expect(withoutRails.length).toBeGreaterThan(0);
    expect(collectRailProductIds(withoutRails)).toEqual([]);
  });

  it('asks for nothing for a rail that is empty', () => {
    expect(collectRailProductIds([{ ...RAIL, products: [] }])).toEqual([]);
  });
});
