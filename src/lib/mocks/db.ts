import type { Locale } from '@/i18n/locales';

import { collectionRecords, NEW_ARRIVALS_COLLECTION } from './catalogue-collections';
import { toProductCard } from './catalogue-db';
import { photoUrl } from './catalogue-photography';

/**
 * D1 — THE fixture source for the mock layer.
 *
 * These records stand in for the Java service while it is being built. They are
 * shaped to satisfy the same Zod schemas the real responses must satisfy, so a
 * fixture that drifts from the contract fails at the boundary (DATA-02) exactly
 * as a non-conforming backend response would.
 *
 * DATA-13: fixtures *report* constraints, they never compute them on the other
 * side of the wire. Availability is not here at all: it is a live read of the
 * stock ledger (`availability-db.ts`), stated as a status — no quantity crosses
 * the wire.
 *
 * Content is held per locale because the real endpoints are locale-scoped
 * (sections 21 and 22). Serving one language for both would hide exactly the
 * class of bug this store cannot afford: an English string inside an Urdu page.
 *
 * Products come from `catalogue-db`, not from a second list here. The homepage
 * rail and the listing page are two views of ONE catalogue, and a separate
 * homepage fixture would let them disagree about what the store sells (PD-01).
 */

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
  catalogueHeading: string;
  catalogueBody: string;
  catalogueCta: string;
  stitchingHeading: string;
  stitchingBody: string;
  stitchingSteps: readonly [string, string, string];
  stitchingCta: string;
}

const HOMEPAGE_COPY: Record<Locale, HomepageCopy> = {
  en: {
    heroHeadline: 'Wash-n-wear, boski and karandi',
    heroSubheadline: 'Stitched and unstitched, delivered across Pakistan.',
    heroCta: 'Browse the catalogue',
    railTitle: 'New arrivals',
    gridTitle: 'Shop by type',
    tiles: ['Unstitched', 'Stitched', 'Two-piece', 'Three-piece'],
    bannerHeading: 'Know your fabric before you buy',
    bannerBody:
      'Wash-n-wear, boski, karandi and cotton behave differently in the heat. The glossary explains each one in plain language.',
    bannerCta: 'Read the fabric glossary',
    catalogueHeading: 'The whole catalogue, in one place',
    catalogueBody:
      'Every fabric and every cut, filterable by colour, price, piece count and availability.',
    catalogueCta: 'Open the catalogue',
    stitchingHeading: 'Your next kameez, cut to the fit you already love',
    stitchingBody:
      'No tailor visit and no second person. Measure a garment you already own, and we cut the new one to match it.',
    stitchingSteps: [
      'Lay a kameez, shalwar or waistcoat you own flat on a bed.',
      'Measure it, with drawings that show you where the tape goes.',
      'We stitch your new one to exactly the same fit.',
    ],
    stitchingCta: 'Take my measurements',
  },
  ur: {
    heroHeadline: 'واش این ویئر، بوسکی اور کرنڈی',
    heroSubheadline: 'سلے اور بغیر سلے، پورے پاکستان میں ترسیل۔',
    heroCta: 'مجموعہ دیکھیں',
    railTitle: 'نئی آمد',
    gridTitle: 'قسم کے مطابق خریدیں',
    tiles: ['بغیر سلے', 'سلے ہوئے', 'ٹو پیس', 'تھری پیس'],
    bannerHeading: 'خریدنے سے پہلے اپنا کپڑا جانیں',
    bannerBody:
      'واش این ویئر، بوسکی، کرنڈی اور کاٹن گرمی میں مختلف برتاؤ کرتے ہیں۔ لغت ہر ایک کو آسان زبان میں سمجھاتی ہے۔',
    bannerCta: 'کپڑوں کی لغت پڑھیں',
    catalogueHeading: 'پورا مجموعہ، ایک ہی جگہ',
    catalogueBody: 'ہر کپڑا اور ہر ڈیزائن — رنگ، قیمت، پیس اور دستیابی کے مطابق چھانٹیں۔',
    catalogueCta: 'مجموعہ کھولیں',
    stitchingHeading: 'آپ کی اگلی قمیض، اسی فٹنگ پر جو آپ کو پسند ہے',
    stitchingBody:
      'نہ درزی کے پاس جانے کی ضرورت، نہ کسی دوسرے شخص کی۔ اپنا پہلے سے موجود لباس ناپیں، ہم نیا اسی کے مطابق کاٹیں گے۔',
    stitchingSteps: [
      'اپنی قمیض، شلوار یا واسکٹ بستر پر سیدھی بچھائیں۔',
      'ہمارے خاکوں کی مدد سے ناپیں، جو بتاتے ہیں کہ فیتہ کہاں رکھنا ہے۔',
      'ہم آپ کا نیا لباس بالکل اسی فٹنگ پر سی دیں گے۔',
    ],
    stitchingCta: 'میرے ناپ لیں',
  },
};

const TILE_IDS = ['unstitched', 'stitched', 'two-piece', 'three-piece'] as const;

const TILE_HREFS = [
  '/catalogue?garmentType=unstitched',
  '/catalogue?garmentType=stitched',
  '/catalogue?pieceCount=2',
  '/catalogue?pieceCount=3',
] as const;

/**
 * One of the client's photographs per tile, chosen to actually SHOW what the
 * tile filters to: the unstitched line is the kurta, and the three-piece tile
 * is a waistcoat suit. A category tile that shows something the filter does not
 * return is worse than no image, because it sets an expectation the listing
 * then breaks.
 */
const TILE_IMAGES = ['kurta-rust', 'kameez-slate', 'kameez-taupe', 'waistcoat-maroon'] as const;

const RAIL_LENGTH = 8;

/** §28.4's hero film, the first of the homepage's sections. */
function heroSection(copy: HomepageCopy) {
  return {
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
  };
}

/**
 * §34's homepage stage, placed directly under the hero. Made-to-Measure is the
 * store's second USP, so it is the first thing a visitor scrolls to, not the last.
 */
function stitchingSection(copy: HomepageCopy) {
  return {
    kind: 'STITCHING_ENTRY',
    id: 'stitching-entry',
    heading: copy.stitchingHeading,
    body: copy.stitchingBody,
    steps: [...copy.stitchingSteps],
    cta: { label: copy.stitchingCta, href: '/stitched' },
  };
}

function categorySection(copy: HomepageCopy) {
  return {
    kind: 'CATEGORY_GRID',
    id: 'shop-by-type',
    title: copy.gridTitle,
    tiles: copy.tiles.map((label, index) => ({
      id: TILE_IDS[index],
      label,
      imageUrl: photoUrl(TILE_IMAGES[index] ?? 'kameez-slate'),
      href: TILE_HREFS[index],
    })),
  };
}

function catalogueSection(copy: HomepageCopy) {
  return {
    kind: 'CATALOGUE_ENTRY',
    id: 'catalogue-entry',
    heading: copy.catalogueHeading,
    body: copy.catalogueBody,
    cta: { label: copy.catalogueCta, href: '/catalogue' },
    previewImageUrls: [
      photoUrl('waistcoat-ivory'),
      photoUrl('kameez-charcoal'),
      photoUrl('waistcoat-bottle'),
      photoUrl('kurta-rust'),
    ],
  };
}

function bannerSection(copy: HomepageCopy) {
  return {
    kind: 'EDITORIAL_BANNER',
    id: 'fabric-story',
    heading: copy.bannerHeading,
    body: copy.bannerBody,
    // The collar-and-placket detail shot: cloth close enough to read.
    imageUrl: photoUrl('kameez-charcoal'),
    // Logical, not physical: the reading-end side in both directions.
    imageSide: 'end',
    cta: { label: copy.bannerCta, href: '/help/fabric-glossary' },
  };
}

/**
 * Section 28.4: a video and four sections. *Which* four is editorial
 * configuration, so this represents what the operator would have set up in the
 * admin panel — not a shape the frontend imposes.
 */
export function homepageFor(locale: Locale) {
  const copy = HOMEPAGE_COPY[locale];

  return {
    sections: [
      heroSection(copy),
      stitchingSection(copy),
      {
        kind: 'PRODUCT_RAIL',
        id: 'new-arrivals',
        title: copy.railTitle,
        collectionSlug: NEW_ARRIVALS_COLLECTION,
        // The rail and its "View all" are one collection, so they cannot disagree.
        products: collectionRecords(NEW_ARRIVALS_COLLECTION)
          .slice(0, RAIL_LENGTH)
          .map((record) => toProductCard(record, locale)),
        viewAllHref: `/catalogue?collection=${NEW_ARRIVALS_COLLECTION}`,
      },
      categorySection(copy),
      catalogueSection(copy),
      bannerSection(copy),
    ],
  };
}

export const NEWSLETTER_SUBSCRIPTION = {
  email: 'someone@example.com',
  status: 'SUBSCRIBED',
} as const;
