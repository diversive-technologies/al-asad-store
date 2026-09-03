import type { Locale } from '@/i18n/locales';

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
 */

const PRODUCT_IDS = [
  '7d1f0a2c-9b4e-4c8a-8f21-0a5c6e3d1b01',
  '7d1f0a2c-9b4e-4c8a-8f21-0a5c6e3d1b02',
  '7d1f0a2c-9b4e-4c8a-8f21-0a5c6e3d1b03',
  '7d1f0a2c-9b4e-4c8a-8f21-0a5c6e3d1b04',
] as const;

/** Fields that never differ by locale: identity, imagery, price, structure. */
const PRODUCT_SHAPE = [
  {
    id: PRODUCT_IDS[0],
    slug: 'embroidered-lawn-three-piece-ivory',
    type: 'SET',
    pieceCount: 3,
    imageUrl: '/placeholders/product-1.avif',
    hoverImageUrl: '/placeholders/product-2.avif',
    pricing: { currentMinor: 1_249_900, originalMinor: null },
    metreage: null,
    isNew: true,
  },
  {
    id: PRODUCT_IDS[1],
    slug: 'printed-lawn-unstitched-indigo',
    type: 'SIMPLE',
    pieceCount: 1,
    imageUrl: '/placeholders/product-2.avif',
    hoverImageUrl: null,
    pricing: { currentMinor: 449_900, originalMinor: 649_900 },
    // Unstitched is sold by length, not by size.
    metreage: 3.5,
    isNew: false,
  },
  {
    id: PRODUCT_IDS[2],
    slug: 'chiffon-two-piece-rose',
    type: 'SET',
    pieceCount: 2,
    imageUrl: '/placeholders/product-3.avif',
    hoverImageUrl: '/placeholders/product-4.avif',
    pricing: { currentMinor: 1_899_900, originalMinor: null },
    metreage: null,
    isNew: false,
  },
  {
    id: PRODUCT_IDS[3],
    slug: 'cotton-kurta-sage',
    type: 'SIMPLE',
    pieceCount: 1,
    imageUrl: '/placeholders/product-4.avif',
    hoverImageUrl: null,
    pricing: { currentMinor: 599_900, originalMinor: null },
    metreage: null,
    isNew: true,
  },
] as const;

interface ProductCopy {
  name: string;
  workType: string;
  fabricName: string;
  colourName: string;
}

/**
 * Localised catalogue fields. Section 22: fabric names carry a fixed Urdu
 * transliteration from the protected-terms list and are never machine
 * translated — "Lawn" must not become the word for grass.
 */
const PRODUCT_COPY: Record<Locale, readonly ProductCopy[]> = {
  en: [
    {
      name: 'Embroidered lawn three-piece',
      workType: 'Embroidered',
      fabricName: 'Lawn',
      colourName: 'Ivory',
    },
    {
      name: 'Printed lawn, unstitched',
      workType: 'Printed',
      fabricName: 'Lawn',
      colourName: 'Indigo',
    },
    {
      name: 'Chiffon two-piece',
      workType: 'Hand-finished',
      fabricName: 'Chiffon',
      colourName: 'Rose',
    },
    { name: 'Cotton kurta', workType: 'Plain', fabricName: 'Cotton', colourName: 'Sage' },
  ],
  ur: [
    {
      name: 'کڑھائی والا لان تھری پیس',
      workType: 'کڑھائی',
      fabricName: 'لان',
      colourName: 'عاجی',
    },
    { name: 'پرنٹڈ لان، بغیر سلا', workType: 'پرنٹڈ', fabricName: 'لان', colourName: 'نیلا' },
    { name: 'شفون ٹو پیس', workType: 'ہاتھ سے تیار', fabricName: 'شفون', colourName: 'گلابی' },
    { name: 'کاٹن کرتا', workType: 'سادہ', fabricName: 'کاٹن', colourName: 'سبزہ' },
  ],
};

function productsFor(locale: Locale) {
  return PRODUCT_SHAPE.map((shape, index) => ({ ...shape, ...PRODUCT_COPY[locale][index] }));
}

/**
 * The availability overlay of architecture 8.2.
 *
 * Deliberately varied so the running store exercises every badge path — and the
 * fourth product is intentionally absent, so the "availability unknown" path is
 * exercised in the real app rather than only in a unit test.
 */
export const AVAILABILITY = [
  { productId: PRODUCT_IDS[0], status: 'IN_STOCK', unavailablePieceNames: [] },
  { productId: PRODUCT_IDS[1], status: 'LOW_STOCK', unavailablePieceNames: [] },
  { productId: PRODUCT_IDS[2], status: 'SOLD_OUT', unavailablePieceNames: ['Dupatta'] },
] as const;

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
        products: productsFor(locale),
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
