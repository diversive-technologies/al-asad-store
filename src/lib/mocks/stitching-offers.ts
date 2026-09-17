import type { StyleOffer } from '@/lib/domain/style-offer';

import type { GarmentKey } from './garment-kinds';
import { styleOfferFor } from './measurement-sets-db';

/**
 * D1 — WHICH garments the workshop will cut, and as what.
 *
 * The backend's declaration, and the single place it is made. It lived on the
 * product DETAIL mock, which meant the catalogue could not read it without an
 * import cycle — and the card has to know the same fact now, because a customer
 * who cannot get their size is the one who most wants to hear that a garment can
 * be made to their measurements.
 *
 * Keyed by the garment KIND rather than by a record, so nothing here has to
 * import the catalogue that imports this — and by the closed kind union, so a
 * new kind will not compile until this table says whether it is cut.
 *
 * A boy's kurta is NOT offered. Every bound on the served lists is an adult's, so
 * the studio would refuse a boy's figures — and a fork that opens a form nobody
 * can complete is worse than no fork. It returns when a boys' set is served.
 */
const STITCHING_STYLE: Readonly<Record<GarmentKey, string | null>> = {
  waistcoat: 'WAISTCOAT_SUIT',
  kameez: 'KAMEEZ_SHALWAR',
  kurta: 'KURTA',
  'boys-kurta': null,
};

/**
 * The offer for a garment kind, or null when the workshop does not cut it.
 *
 * The style id loses its brand because this is the WIRE shape: branding happens
 * where the schema parses it, not here.
 */
export function stitchingOfferForGarment(
  garment: GarmentKey,
): (Omit<StyleOffer, 'garmentStyle'> & { garmentStyle: string }) | null {
  const style = STITCHING_STYLE[garment];
  return style === null ? null : styleOfferFor(style);
}

/** Whether a garment kind can be made to measure at all — what a CARD needs. */
export function isMadeToMeasureGarment(garment: GarmentKey): boolean {
  return stitchingOfferForGarment(garment) !== null;
}
