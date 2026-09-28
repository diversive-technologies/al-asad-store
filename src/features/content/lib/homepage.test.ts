import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import { ROUTES } from '@/config/routes';

import {
  homepageSchema,
  type HomepageSection,
  type ProductRailSection,
} from '../schemas/homepage.schema';
import { collectRailProductIds } from './homepage';

/*
 * PERF-02 / architecture 8.2: the homepage asks for live availability ONCE, for
 * every product any rail shows. These run against a homepage written in the wire
 * shape and parsed through the real contract, so the sections are the shapes the
 * page is handed. Which sections the page holds is the operator's (§28.4); this
 * one holds a rail between two sections that are not rails, which is all the
 * cases below need. The words are placeholders (SEC-10).
 */
type HomepageWire = z.input<typeof homepageSchema>;
type RailWire = Extract<HomepageWire['sections'][number], { kind: 'PRODUCT_RAIL' }>;

/** A product as a rail carries it — the catalogue's card projection. */
function railProduct(n: number): RailWire['products'][number] {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    slug: `fixture-rail-product-${String(n)}`,
    name: `Fixture rail product ${String(n)}`,
    type: 'SIMPLE',
    pieceCount: 1,
    images: [`/placeholders/product-${String(n)}.avif`],
    workType: 'Plain',
    fabricName: 'Cotton',
    colourName: 'Ivory',
    pricing: { currentMinor: 349_900, originalMinor: null },
    metreage: null,
    isNew: false,
    isMadeToMeasure: false,
  };
}

const CTA = { label: 'Placeholder call to action', href: ROUTES.catalogue.list };

const SECTIONS = homepageSchema.parse({
  sections: [
    {
      kind: 'HERO_VIDEO',
      id: 'hero',
      poster: { light: '/placeholders/hero-light.avif', dark: '/placeholders/hero-dark.avif' },
      video: null,
      headline: 'Placeholder headline',
      subheadline: 'Placeholder subheadline',
      cta: CTA,
    },
    {
      kind: 'PRODUCT_RAIL',
      id: 'rail',
      title: 'Placeholder rail',
      collectionSlug: 'fixture-collection',
      products: [railProduct(1), railProduct(2), railProduct(3)],
      viewAllHref: ROUTES.catalogue.list,
    },
    {
      kind: 'CATALOGUE_ENTRY',
      id: 'catalogue-entry',
      heading: 'Placeholder heading',
      body: 'Placeholder body.',
      cta: CTA,
      previewImageUrls: [],
    },
  ],
} satisfies HomepageWire).sections;

function onlyRail(sections: readonly HomepageSection[]): ProductRailSection {
  const rails = sections.filter(
    (section): section is ProductRailSection => section.kind === 'PRODUCT_RAIL',
  );
  const [rail, ...others] = rails;
  if (rail === undefined || others.length > 0) {
    throw new Error(`expected the homepage to hold one rail, found ${rails.length}`);
  }
  return rail;
}

const RAIL = onlyRail(SECTIONS);
const [FIRST, SECOND, THIRD] = RAIL.products;
if (FIRST === undefined || SECOND === undefined || THIRD === undefined) {
  throw new Error('expected the rail to show at least three products');
}

describe('the products the homepage asks availability for', () => {
  it('names every product the rail shows, in the order it shows them', () => {
    expect(collectRailProductIds(SECTIONS)).toEqual(RAIL.products.map((product) => product.id));
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
    const withoutRails = SECTIONS.filter((section) => section.kind !== 'PRODUCT_RAIL');

    expect(withoutRails.length).toBeGreaterThan(0);
    expect(collectRailProductIds(withoutRails)).toEqual([]);
  });

  it('asks for nothing for a rail that is empty', () => {
    expect(collectRailProductIds([{ ...RAIL, products: [] }])).toEqual([]);
  });
});
