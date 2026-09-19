import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { CATALOGUE, toProductCard } from '@/lib/mocks/catalogue-db';
import { formatMetres } from '@/lib/utils/format';

import { productCardSchema } from '../schemas/product-card.schema';
import { ProductCardStrip } from './ProductCardStrip';

/**
 * §28.1 lists metreage among a card's facts. The card's reveal carries it on
 * hover or focus, which a touch screen never gives — so a length's card showed
 * its metreage to no phone at all. The strip, which is always drawn, says it
 * where nothing can hover (`card-touch-only`).
 */

function cardFor(hasMetreage: boolean) {
  const record = CATALOGUE.find((entry) => (entry.metreage !== null) === hasMetreage);
  return productCardSchema.parse(record === undefined ? null : toProductCard(record, 'en'));
}

function strip(hasMetreage: boolean): string {
  return renderToStaticMarkup(
    <ProductCardStrip product={cardFor(hasMetreage)} locale="en" messages={en} />,
  );
}

describe('the card strip', () => {
  it('says a length’s metreage where nothing can hover', () => {
    const metres = formatMetres(cardFor(true).metreage ?? 0, 'en');

    expect(strip(true)).toContain(
      `<span class="card-touch-only"><span aria-hidden="true"> · </span><bdi>${metres}</bdi></span>`,
    );
  });

  it('says nothing more for a garment sold by size', () => {
    expect(strip(false)).not.toContain('card-touch-only');
  });
});
