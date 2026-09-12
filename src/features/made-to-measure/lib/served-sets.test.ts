import { describe, expect, it } from 'vitest';

import { LOCALES } from '@/i18n/locales';
import { styleOffersSchema } from '@/lib/domain/style-offer';
import { CATALOGUE } from '@/lib/mocks/catalogue-db';
import { measurementCopyFor } from '@/lib/mocks/measurement-copy-db';
import { STYLE_OFFERS } from '@/lib/mocks/measurement-sets-db';
import { toProductDetail } from '@/lib/mocks/product-detail-db';

import { measurementCopySchema } from '../schemas/measurement-copy.schema';
import { KAMEEZ_VARIANTS } from './kameez-variants';
import { sanitizeMarks } from './marks';
import { joinCopy } from './studio-set';
import { EVERY_POINT, servedSet } from './test-support';

/*
 * What the mock backend serves, held to the guarantees the real one will have to
 * meet. Rows here are content, so nothing at compile time can prove them — a
 * point with no words or a mark off its drawing would otherwise surface only as
 * a broken page.
 */
const OFFERS = styleOffersSchema.parse(STYLE_OFFERS);
const STYLES = OFFERS.map((offer) => offer.garmentStyle);

describe('what the backend serves', () => {
  it.each(STYLES)('serves a %s list that meets the contract', (style) => {
    expect(() => servedSet(style)).not.toThrow();
  });

  it.each(STYLES)('draws every mark on the %s list', (style) => {
    // Nothing off its drawing, and no two marks on one garment close enough to
    // be one hit area.
    expect(sanitizeMarks(servedSet(style)).dropped).toEqual([]);
  });

  it.each([...LOCALES])('words every style, garment and point in %s', (locale) => {
    const copy = measurementCopySchema.parse(measurementCopyFor(locale));
    for (const style of STYLES) {
      const joined = joinCopy(servedSet(style), OFFERS, copy);
      expect(joined.ok ? [] : joined.error, `${locale} ${style}`).toEqual([]);
    }
  });

  it.each(STYLES)('names only drawing variants the %s drawings know', (style) => {
    // An unknown name still draws a whole garment, but a served one should draw.
    const set = servedSet(style);
    for (const group of set.options) {
      const drawing = set.pieces.find((piece) => piece.id === group.pieceId)?.drawingId;
      for (const value of group.values) {
        if (value.drawingVariant === null) continue;
        expect(drawing, `${group.id}.${value.id}`).toBe('KAMEEZ');
        expect(KAMEEZ_VARIANTS, `${group.id}.${value.id}`).toContain(value.drawingVariant);
      }
    }
  });

  it('describes the finished garment on every point, for the garment-copy path', () => {
    for (const point of EVERY_POINT) expect(point.basis, point.id).toBe('GARMENT');
  });

  it('keeps every half range narrower than its own double', () => {
    /*
     * A half point whose maximum reaches twice its minimum accepts one number as
     * a valid half AND a valid full figure, so its bounds cannot catch the most
     * common misreading there is. These are named, not hidden, until real cards
     * settle them — and asserted to still overlap, so the list cannot go stale.
     */
    const KNOWN_OVERLAPS: ReadonlySet<string> = new Set(['shalwarWaist']);

    for (const point of EVERY_POINT) {
      if (point.enteredAs !== 'HALF' || KNOWN_OVERLAPS.has(point.id)) continue;
      expect(point.maxMm, point.id).toBeLessThan(2 * point.minMm);
    }
    for (const point of EVERY_POINT.filter((candidate) => KNOWN_OVERLAPS.has(candidate.id))) {
      expect(point.maxMm, point.id).toBeGreaterThanOrEqual(2 * point.minMm);
    }
  });
});

describe('the product page and the studio agree', () => {
  it("offers stitching only in a style the studio serves, at the studio's lead time", () => {
    for (const record of CATALOGUE) {
      const offer = toProductDetail(record, 'en').stitching;
      if (offer === null) continue;
      expect(STYLE_OFFERS, record.slug).toContainEqual(offer);
    }
  });

  it('opens a list with as many garments as the product has pieces', () => {
    // A one-piece kurta sent to the kameez shalwar list was asked for a shalwar
    // it was not buying.
    for (const record of CATALOGUE) {
      const product = toProductDetail(record, 'en');
      if (product.stitching === null) continue;
      expect(servedSet(product.stitching.garmentStyle).pieces, record.slug).toHaveLength(
        product.pieces.length,
      );
    }
  });

  it("offers no stitching on a boy's kurta, because every served bound is an adult's", () => {
    const boys = CATALOGUE.filter((record) => record.garment === 'boys-kurta');
    expect(boys.length).toBeGreaterThan(0);
    for (const record of boys) expect(toProductDetail(record, 'en').stitching).toBeNull();
  });
});
