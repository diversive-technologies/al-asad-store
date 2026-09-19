import type { Locale } from '@/i18n/locales';

import { frameUrls, PHOTOGRAPHY, type Photograph } from './catalogue-photography';
import {
  FABRICS,
  vocabularyLabel,
  WORK_TYPES,
  type ColourKey,
  type FabricKey,
  type WorkKey,
} from './catalogue-vocabulary';
import type { GarmentKey } from './garment-kinds';
import { isMadeToMeasureGarment } from './stitching-offers';

/**
 * D1 — the catalogue fixture, large enough to exercise the things a four-item
 * fixture cannot: pagination, facet counts that actually vary, and filter
 * combinations that return nothing.
 *
 * Records here carry MORE than the wire shape. `launchedAt`, the filter keys and
 * the stock seed are what a backend would hold and query on; the product
 * card projection sent to the client is derived from them. Keeping the two
 * distinct is the point — if the fixture were shaped exactly like the response,
 * it could not model filtering or sorting at all.
 */

/**
 * §6.1 — piece count follows the garment, and the garment is what was
 * photographed. A waistcoat suit is the three-piece case the SET model exists
 * for: waistcoat, kameez and shalwar, each sized and stocked on its own.
 */
const PIECES: Record<GarmentKey, number> = {
  waistcoat: 3,
  kameez: 2,
  kurta: 1,
  'boys-kurta': 1,
};

export interface CatalogueRecord {
  id: string;
  code: string;
  slug: string;
  fabric: FabricKey;
  colour: ColourKey;
  workType: WorkKey;
  garmentType: 'unstitched' | 'stitched';
  /** DATA-13a: declared at creation, never inferred by counting rows. */
  type: 'SIMPLE' | 'SET';
  pieceCount: number;
  currentMinor: number;
  originalMinor: number | null;
  metreage: number | null;
  isNew: boolean;
  /** DATA-12: ISO-8601 on the wire; here it drives the NEWEST sort. */
  launchedAt: string;
  /**
   * Whether stock was ever RECEIVED for this product — a SEED, not an answer.
   *
   * It decides what `inventory-db.ts` puts on the shelf: a product that was
   * never received holds zero of every `(piece, size)`. It is also the whole
   * stock fact for a piece sold by LENGTH, which has no size to key a row on.
   *
   * Nothing reads it to tell a customer whether something can be bought. §15
   * says stock is never read from the index, so the card overlay, the "In stock
   * only" filter, its count and the best sellers all ask `availability-db.ts`,
   * which subtracts live holds and allocations from the ledger — the same answer
   * the product page gets, so a card and its page cannot disagree.
   */
  isInStock: boolean;
  /** Which of the client's photographs this product is. */
  photo: Photograph;
  garment: GarmentKey;
}

const LAUNCH_EPOCH = Date.parse('2026-08-01T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Deterministic rather than random: the same fixture every run means a
 * screenshot, a facet count and a failing test all refer to the same catalogue.
 * The moduli are deliberately coprime with each other so attributes vary
 * independently instead of moving in lockstep.
 */
export const CATALOGUE: readonly CatalogueRecord[] = PHOTOGRAPHY.map(
  (photo, index): CatalogueRecord => {
    /*
     * ONE product per photograph. The fixture used to offer each garment twice,
     * in two cloths, which put the same picture on two tiles of one page; every
     * tile now shows a garment no other tile does.
     */
    const pieceCount = PIECES[photo.garment];
    const fabric = FABRICS[index % FABRICS.length] ?? 'cotton';
    const colour = photo.colour;
    // The work on the cloth where the picture shows it, generated where it does not.
    const workType = photo.work ?? WORK_TYPES[(index * 3) % WORK_TYPES.length] ?? 'plain';
    /*
     * The adult kurta is the unstitched line. Tying this to the garment rather
     * than to `index % 2` is what keeps it sane now that photography drives the
     * fixture: the old parity rule would have made an UNSTITCHED product out of
     * whichever photograph happened to land on an even index, and the two that
     * did were the boys' kurtas.
     */
    const garmentType = photo.garment === 'kurta' ? 'unstitched' : 'stitched';
    const currentMinor = 349_900 + ((index * 187_000) % 1_750_000);
    const isDiscounted = index % 4 === 1;

    return {
      id: `7d1f0a2c-9b4e-4c8a-8f21-${String(index + 1).padStart(12, '0')}`,
      code: `AA-${String(1000 + index)}`,
      slug: `${fabric}-${photo.garment}-${colour}-${String(index + 1)}`,
      fabric,
      colour,
      workType,
      garmentType,
      // DATA-13a: SIMPLE or SET is declared here, and piece count follows it.
      type: pieceCount === 1 ? 'SIMPLE' : 'SET',
      pieceCount,
      currentMinor,
      originalMinor: isDiscounted ? Math.round(currentMinor * 1.35) : null,
      /*
       * Spread deliberately, and checked against the unstitched indices rather
       * than assumed. All three Fabric Calculator verdicts have to be reachable
       * from a product page: a fixture that cannot produce one of a feature's
       * three outcomes hides it from every screenshot and every review. The two
       * unstitched products sit at positions 1 and 5 (see `PHOTOGRAPHY`), so
       * they land on 2.5m and 4.5m, which gives COMFORTABLE on one and
       * JUST_ENOUGH or INSUFFICIENT on the other depending on height.
       */
      metreage: garmentType === 'unstitched' ? 2.0 + (index % 6) * 0.5 : null,
      isNew: index % 5 === 0,
      launchedAt: new Date(LAUNCH_EPOCH - index * DAY_MS).toISOString(),
      // Positions 3, 10 and 17 were never received, so empty states are reachable.
      isInStock: index % 7 !== 3,
      photo,
      garment: photo.garment,
    };
  },
);

/**
 * The wire shape — deliberately narrower than the record above.
 *
 * Declared here rather than imported from the catalogue feature: MOD-01 forbids
 * `lib/` importing from `features/`, and the separation is faithful anyway. The
 * Java service will declare its own DTO; what binds the two is the Zod schema
 * this payload has to survive at the boundary (DATA-02).
 */
export interface ProductCardPayload {
  id: string;
  slug: string;
  name: string;
  type: 'SIMPLE' | 'SET';
  pieceCount: number;
  images: string[];
  workType: string;
  fabricName: string;
  colourName: string;
  pricing: { currentMinor: number; originalMinor: number | null };
  metreage: number | null;
  isNew: boolean;
  isMadeToMeasure: boolean;
}

/**
 * A product's name, in one locale — the one place it is assembled, so the card,
 * the product page and the search index cannot call one product two things.
 *
 * Stands in for a backend-authored, per-locale product name. Assembling it here
 * is fixture generation, not interface copy (I18N-06 governs the latter).
 *
 * Work type plus garment, NOT fabric plus garment: the card already prints
 * fabric and colour on its own line, and a name that repeated the fabric read as
 * "Wash-n-wear Kameez Shalwar / Wash-n-wear · Charcoal".
 */
export function productNameFor(record: CatalogueRecord, locale: Locale): string {
  return `${vocabularyLabel(locale, record.workType)} ${vocabularyLabel(locale, record.garment)}`;
}

/** TS-08: an exported function declares its return type. */
export function toProductCard(record: CatalogueRecord, locale: Locale): ProductCardPayload {
  return {
    id: record.id,
    slug: record.slug,
    name: productNameFor(record, locale),
    type: record.type,
    pieceCount: record.pieceCount,
    images: frameUrls(record.photo),
    workType: vocabularyLabel(locale, record.workType),
    fabricName: vocabularyLabel(locale, record.fabric),
    colourName: vocabularyLabel(locale, record.colour),
    pricing: { currentMinor: record.currentMinor, originalMinor: record.originalMinor },
    metreage: record.metreage,
    isNew: record.isNew,
    /* §34 — the same declaration the product page's fork reads, so a card and
       the page it opens can never disagree about whether a garment is cut. */
    isMadeToMeasure: isMadeToMeasureGarment(record.garment),
  };
}
