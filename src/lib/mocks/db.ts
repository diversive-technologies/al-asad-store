import type { Locale } from '@/i18n/locales';

import { CATALOGUE, toProductCard } from './catalogue-db';

/**
 * D1 — THE fixture source for the mock layer.
 *
 * These records stand in for the Java service while it is being built. They are
 * shaped to satisfy the same Zod schemas the real responses must satisfy, so a
 * fixture that drifts from the contract fails at the boundary (DATA-02) exactly
 * as a non-conforming backend response would.
 *
 * DATA-13: fixtures *report* constraints, they never compute them. Availability
 * is stated as a status, the way the backend states it — no quantity crosses
 * the wire and no threshold is applied on this side of it.
 *
 * Content is held per locale because the real endpoints are locale-scoped
 * (sections 21 and 22). Serving one language for both would hide exactly the
 * class of bug this store cannot afford: an English string inside an Urdu page.
 *
 * Products come from `catalogue-db`, not from a second list here. The homepage
 * rail and the listing page are two views of ONE catalogue, and a separate
 * homepage fixture would let them disagree about what the store sells (PD-01).
 */

/**
 * The availability overlay of architecture 8.2, derived from the catalogue so a
 * product cannot exist in one and be missing from the other.
 *
 * Two products are deliberately withheld: availability that never arrives is a
 * real state the interface has to handle without claiming an item is buyable
 * (DATA-13a), and it should be reachable in the running store rather than only
 * in a unit test.
 */
export const AVAILABILITY = CATALOGUE.filter((_, index) => index % 11 !== 6).map(
  (record, index) => {
    if (!record.isInStock) {
      return {
        productId: record.id,
        status: 'SOLD_OUT' as const,
        // A SET is unbuyable when one piece is gone, and the backend says which.
        unavailablePieceNames: record.type === 'SET' ? ['Dupatta'] : [],
      };
    }

    return {
      productId: record.id,
      status: index % 5 === 2 ? ('LOW_STOCK' as const) : ('IN_STOCK' as const),
      unavailablePieceNames: [],
    };
  },
);

interface HomepageCopy {
  heroHeadline: string;
  heroSubheadline: string;
  heroCta: string;
  railTitle: string;
  gridTitle: string;
  tiles: readonly string[];
  bannerHeading: string;
  bannerBody: string;
  bannerCta: string;
}

const HOMEPAGE_COPY: Record<Locale, HomepageCopy> = {
  en: {
    heroHeadline: 'Lawn, cotton and chiffon',
    heroSubheadline: 'Stitched and unstitched, delivered across Pakistan.',
    heroCta: 'Browse the catalogue',
    railTitle: 'New arrivals',
    gridTitle: 'Shop by type',
    tiles: ['Unstitched', 'Stitched', 'Two-piece', 'Three-piece'],
    bannerHeading: 'Know your fabric before you buy',
    bannerBody:
      'Lawn, cambric, chiffon and cotton behave differently in the heat. The glossary explains each one in plain language.',
    bannerCta: 'Read the fabric glossary',
  },
  ur: {
    heroHeadline: 'لان، کاٹن اور شفون',
    heroSubheadline: 'سلے اور بغیر سلے، پورے پاکستان میں ترسیل۔',
    heroCta: 'مجموعہ دیکھیں',
    railTitle: 'نئی آمد',
    gridTitle: 'قسم کے مطابق خریدیں',
    tiles: ['بغیر سلے', 'سلے ہوئے', 'ٹو پیس', 'تھری پیس'],
    bannerHeading: 'خریدنے سے پہلے اپنا کپڑا جانیں',
    bannerBody:
      'لان، کیمبرک، شفون اور کاٹن گرمی میں مختلف برتاؤ کرتے ہیں۔ لغت ہر ایک کو آسان زبان میں سمجھاتی ہے۔',
    bannerCta: 'کپڑوں کی لغت پڑھیں',
  },
};

const TILE_IDS = ['unstitched', 'stitched', 'two-piece', 'three-piece'] as const;

const TILE_HREFS = [
  '/catalogue?garmentType=unstitched',
  '/catalogue?garmentType=stitched',
  '/catalogue?pieceCount=2',
  '/catalogue?pieceCount=3',
] as const;

const RAIL_LENGTH = 8;

/**
 * Section 28.4: a video and four sections. *Which* four is editorial
 * configuration, so this represents what the operator would have set up in the
 * admin panel — not a shape the frontend imposes.
 */
export function homepageFor(locale: Locale) {
  const copy = HOMEPAGE_COPY[locale];

  return {
    sections: [
      {
        kind: 'HERO_VIDEO',
        id: 'hero',
        // One still and one film per colour scheme. The interface swaps between
        // them without reloading the page, carrying the playback position
        // across, so toggling the theme reads as a grade change rather than a
        // restart.
        poster: { light: '/hero/poster-light.avif', dark: '/hero/poster-dark.avif' },
        video: { light: '/hero/light.mp4', dark: '/hero/dark.mp4' },
        headline: copy.heroHeadline,
        subheadline: copy.heroSubheadline,
        cta: { label: copy.heroCta, href: '/catalogue' },
      },
      {
        kind: 'PRODUCT_RAIL',
        id: 'new-arrivals',
        title: copy.railTitle,
        collectionSlug: 'new-arrivals',
        products: CATALOGUE.slice(0, RAIL_LENGTH).map((record) => toProductCard(record, locale)),
        viewAllHref: '/catalogue?collection=new-arrivals',
      },
      {
        kind: 'CATEGORY_GRID',
        id: 'shop-by-type',
        title: copy.gridTitle,
        tiles: copy.tiles.map((label, index) => ({
          id: TILE_IDS[index],
          label,
          imageUrl: '/placeholders/category-' + String(index + 1) + '.avif',
          href: TILE_HREFS[index],
        })),
      },
      {
        kind: 'EDITORIAL_BANNER',
        id: 'fabric-story',
        heading: copy.bannerHeading,
        body: copy.bannerBody,
        imageUrl: '/placeholders/editorial.avif',
        // Logical, not physical: the reading-end side in both directions.
        imageSide: 'end',
        cta: { label: copy.bannerCta, href: '/help/fabric-glossary' },
      },
    ],
  };
}

export const NEWSLETTER_SUBSCRIPTION = {
  email: 'someone@example.com',
  status: 'SUBSCRIBED',
} as const;

export const MOCK_SESSION = {
  mobile: '03001234567',
  displayName: 'Guest tester',
} as const;
