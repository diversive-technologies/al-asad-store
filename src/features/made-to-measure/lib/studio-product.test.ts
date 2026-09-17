import { describe, expect, it } from 'vitest';

import { garmentStyleIdSchema, productIdSchema } from '@/lib/domain/ids';
import { styleOffersSchema } from '@/lib/domain/style-offer';

import { settleStudioStyle, type StudioProduct } from './studio-product';

const OFFERS = styleOffersSchema.parse([
  { garmentStyle: 'KAMEEZ_SHALWAR', leadTimeDays: 7, stitchingChargeMinor: 250000 },
  { garmentStyle: 'WAISTCOAT_SUIT', leadTimeDays: 10, stitchingChargeMinor: 400000 },
]);

const style = (value: string) => garmentStyleIdSchema.parse(value);

function productCutAs(garmentStyle: string): StudioProduct {
  return {
    id: productIdSchema.parse('0b4c1f7e-6d2a-4c1e-9f3b-2a7d8e5c4b10'),
    slug: 'plain-waistcoat-suit-1',
    name: 'Plain Waistcoat Suit',
    imageUrl: '/products/x.avif',
    imageAlt: '',
    garmentStyle: style(garmentStyle),
  };
}

describe('which list the studio opens', () => {
  it('opens the style asked for when no product is in play', () => {
    expect(settleStudioStyle(OFFERS, style('WAISTCOAT_SUIT'), null)).toEqual({
      style: 'WAISTCOAT_SUIT',
      product: null,
      fellBack: false,
      productDropped: false,
    });
  });

  it('falls back to the FIRST style offered, and says so, when the style asked for is not offered', () => {
    expect(settleStudioStyle(OFFERS, style('KURTA'), null)).toMatchObject({
      style: 'KAMEEZ_SHALWAR',
      fellBack: true,
    });
  });

  it('does not call a bare address a fallback', () => {
    expect(settleStudioStyle(OFFERS, null, null)).toMatchObject({
      style: 'KAMEEZ_SHALWAR',
      fellBack: false,
    });
  });

  it('lets a PRODUCT settle the style, over a style the address contradicts it with', () => {
    const product = productCutAs('WAISTCOAT_SUIT');
    const settled = settleStudioStyle(OFFERS, style('KAMEEZ_SHALWAR'), product);

    expect(settled.style).toBe('WAISTCOAT_SUIT');
    expect(settled.product).toBe(product);
    // The product overruled the address; the banner says which garment, so this
    // is not a fallback the customer needs telling about.
    expect(settled.fellBack).toBe(false);
    expect(settled.productDropped).toBe(false);
  });

  it('keeps a product in play over an address that asks for an unoffered style', () => {
    expect(settleStudioStyle(OFFERS, style('NOPE'), productCutAs('KAMEEZ_SHALWAR'))).toMatchObject({
      style: 'KAMEEZ_SHALWAR',
      fellBack: false,
      productDropped: false,
    });
  });

  it('DROPS a product cut as a style the workshop no longer offers, rather than opening another list under its name', () => {
    const settled = settleStudioStyle(OFFERS, style('WAISTCOAT_SUIT'), productCutAs('KURTA'));

    expect(settled.product).toBeNull();
    expect(settled.productDropped).toBe(true);
    // With the product gone the address is obeyed exactly as it would have been.
    expect(settled.style).toBe('WAISTCOAT_SUIT');
    expect(settled.fellBack).toBe(false);
  });
});
