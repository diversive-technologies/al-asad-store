import { describe, expect, it } from 'vitest';

import { CATALOGUE, toProductCard } from './catalogue-db';
import { toProductDetail } from './product-detail-db';
import { isMadeToMeasureGarment, stitchingOfferForGarment } from './stitching-offers';

/*
 * The card and the product page read ONE declaration. They used to be two
 * places — the offer on the detail mock, and nothing on the card — and a card
 * that says "can be stitched to size" over a product whose page draws no fork
 * would be a promise the page then withdraws.
 */
describe('which garments the workshop cuts', () => {
  it('marks a card made to measure exactly when its product page offers stitching', () => {
    for (const record of CATALOGUE) {
      const card = toProductCard(record, 'en');
      const detail = toProductDetail(record, 'en');
      expect(card.isMadeToMeasure, record.slug).toBe(detail.stitching !== null);
    }
  });

  /*
   * This used to assert that SOME products are unmarked, "so the mark carries
   * information". It cannot any more, and the change is worth stating rather
   * than quietly relaxing: a boy's kurta was the only garment the workshop did
   * not cut, and both boys' products were withdrawn with their photograph on
   * 2026-09-23. Every garment the store now sells is cut to measure, so the
   * mark is true on every card and distinguishes none of them.
   *
   * The guard is therefore inverted rather than deleted. It still fails the
   * moment the table and the catalogue disagree — which is what it was really
   * protecting — and it will fail again, correctly, if a kind that is NOT cut
   * is added without the card being taught about it.
   */
  it('marks every product, because every garment the store now sells is cut', () => {
    const marked = CATALOGUE.filter((record) => toProductCard(record, 'en').isMadeToMeasure);

    expect(CATALOGUE.length).toBeGreaterThan(0);
    expect(marked).toHaveLength(CATALOGUE.length);
  });

  it('answers null for a kind the workshop does not cut', () => {
    for (const garment of ['waistcoat', 'kameez', 'kurta'] as const) {
      expect(stitchingOfferForGarment(garment), garment).not.toBeNull();
      expect(isMadeToMeasureGarment(garment), garment).toBe(true);
    }
  });
});
