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

  it('offers some garments and not others, so the mark carries information', () => {
    const marked = CATALOGUE.filter((record) => toProductCard(record, 'en').isMadeToMeasure);
    expect(marked.length).toBeGreaterThan(0);
    expect(marked.length).toBeLessThan(CATALOGUE.length);
  });

  it("does not offer a boy's kurta, whose every served bound is an adult's", () => {
    expect(stitchingOfferForGarment('boys-kurta')).toBeNull();
    expect(isMadeToMeasureGarment('boys-kurta')).toBe(false);
  });
});
