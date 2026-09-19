import type { Locale } from '@/i18n/locales';

import { CATALOGUE, type CatalogueRecord } from './catalogue-db';

/**
 * D1 — architecture §25, the Fabric Calculator, standing in for its backend
 * module. Split out of `product-detail-db.ts` (MOD-03): the product page only
 * carries the OFFER, and the verdict is its own read.
 */

/**
 * §25's requirement table, standing in for the backend module that owns it.
 *
 * The table is the whole feature: metres required per height band and garment
 * style. It lives HERE and not in the frontend because §25 makes it a backend
 * module — the interface asks and renders, it does not subtract. The margin
 * below is the configured threshold that separates "comfortable" from "just
 * enough", and it is a commercial setting the operator tunes.
 */
const GARMENT_STYLES: Record<Locale, readonly { id: string; label: string }[]> = {
  en: [
    { id: 'kameez-shalwar', label: 'Kameez and shalwar' },
    { id: 'long-kameez', label: 'Long kameez' },
    { id: 'short-kurta', label: 'Short kurta' },
  ],
  ur: [
    { id: 'kameez-shalwar', label: 'قمیض اور شلوار' },
    { id: 'long-kameez', label: 'لمبی قمیض' },
    { id: 'short-kurta', label: 'چھوٹا کرتا' },
  ],
};

const MIN_HEIGHT_CM = 140;
const MAX_HEIGHT_CM = 200;

/** Metres required at the shortest height, plus metres per cm of extra height. */
const REQUIREMENT: Record<string, { base: number; perCm: number }> = {
  'kameez-shalwar': { base: 4.4, perCm: 0.012 },
  'long-kameez': { base: 3.3, perCm: 0.009 },
  'short-kurta': { base: 2.4, perCm: 0.006 },
};

/** Below this surplus, §25 says the answer is JustEnough rather than Comfortable. */
const COMFORT_MARGIN_METRES = 0.3;

export function fabricCalculatorOfferFor(
  record: CatalogueRecord,
  locale: Locale,
): { styles: { id: string; label: string }[]; minHeightCm: number; maxHeightCm: number } | null {
  // §25: offered only for products with at least one unstitched piece. The
  // backend decides this; the frontend renders whatever it is told.
  if (record.garmentType !== 'unstitched') return null;

  return {
    styles: [...GARMENT_STYLES[locale]],
    minHeightCm: MIN_HEIGHT_CM,
    maxHeightCm: MAX_HEIGHT_CM,
  };
}

export type FabricVerdictPayload =
  | { kind: 'COMFORTABLE'; spareMetres: number }
  | { kind: 'JUST_ENOUGH' }
  | { kind: 'INSUFFICIENT'; shortfallMetres: number };

/** §25 `evaluate(product_id, height_cm, style)`. A lookup and a subtraction. */
export function evaluateFabric(
  productId: string,
  heightCm: number,
  styleId: string,
): FabricVerdictPayload | null {
  const record = CATALOGUE.find((entry) => entry.id === productId);
  const requirement = REQUIREMENT[styleId];

  if (record === undefined || requirement === undefined) return null;
  if (record.metreage === null) return null;

  const clamped = Math.min(Math.max(heightCm, MIN_HEIGHT_CM), MAX_HEIGHT_CM);
  const required = requirement.base + (clamped - MIN_HEIGHT_CM) * requirement.perCm;
  // Rounded to centimetres of cloth; a figure like 0.30000000000000004 helps
  // nobody and would render as noise.
  const surplus = Math.round((record.metreage - required) * 100) / 100;

  if (surplus < 0) return { kind: 'INSUFFICIENT', shortfallMetres: Math.abs(surplus) };
  if (surplus < COMFORT_MARGIN_METRES) return { kind: 'JUST_ENOUGH' };

  return { kind: 'COMFORTABLE', spareMetres: surplus };
}
