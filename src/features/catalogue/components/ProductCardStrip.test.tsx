import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { formatMetres } from '@/lib/utils/format';

import { productCardFixture } from '../lib/test-fixtures';
import type { ProductCard } from '../schemas/product-card.schema';
import { ProductCardStrip } from './ProductCardStrip';

/**
 * §28.1 lists metreage among a card's facts. The card's reveal carries it on
 * hover or focus, which a touch screen never gives — so a length's card showed
 * its metreage to no phone at all. The strip, which is always drawn, says it
 * where nothing can hover (`card-touch-only`).
 */

const METREAGE = 2.5;
/** Unstitched cloth, sold by length. */
const LENGTH = productCardFixture(1, { metreage: METREAGE });
/** A stitched garment, sold by size — it has no length to state. */
const GARMENT = productCardFixture(2, { metreage: null });

function strip(product: ProductCard): string {
  return renderToStaticMarkup(<ProductCardStrip product={product} locale="en" messages={en} />);
}

describe('the card strip', () => {
  it('says a length’s metreage where nothing can hover', () => {
    const metres = formatMetres(METREAGE, 'en');

    expect(strip(LENGTH)).toContain(
      `<span class="card-touch-only"><span aria-hidden="true"> · </span><bdi>${metres}</bdi></span>`,
    );
  });

  it('says nothing more for a garment sold by size', () => {
    expect(strip(GARMENT)).not.toContain('card-touch-only');
  });
});
