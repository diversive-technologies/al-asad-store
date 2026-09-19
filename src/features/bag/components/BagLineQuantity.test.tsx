import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { formatNumber } from '@/lib/utils/format';

import { bagLineSchema, type BagLine } from '../schemas/bag.schema';
import { BagLineQuantity } from './BagLineQuantity';

/**
 * TEST-08 — the quantity buttons DISABLED themselves while a change was in
 * flight, and a disabled button drops the keyboard focus it holds: pressing +
 * sent focus to the top of the page (fixNow 42). Busy is now `aria-busy` on a
 * button that stays enabled; only "cannot go below one" is a real disabled state.
 */

function lineWith(quantity: number): BagLine {
  return bagLineSchema.parse({
    id: 'a1b2c3d4-0001-4c8a-8f21-000000000001',
    productId: 'b1b2c3d4-0001-4c8a-8f21-000000000001',
    slug: 'plain-waistcoat-suit',
    name: 'Plain Waistcoat Suit',
    imageUrl: '/products/example.avif',
    type: 'SIMPLE',
    quantity,
    unitPriceMinor: 700_000,
    lineTotalMinor: 700_000 * quantity,
    pieces: [
      {
        pieceId: 'c1b2c3d4-0001-4c8a-8f21-000000000001',
        name: 'Kameez',
        sizeId: 'd1b2c3d4-0001-4c8a-8f21-000000000001',
        sizeLabel: 'M',
      },
    ],
    reservationExpiresAt: '2026-09-17T12:00:00.000Z',
    stitching: null,
    movableToWishlist: true,
  });
}

function markupOf(quantity: number, isBusy: boolean): string {
  return renderToStaticMarkup(
    <BagLineQuantity
      line={lineWith(quantity)}
      locale="en"
      messages={en}
      isBusy={isBusy}
      onChange={() => true}
    />,
  );
}

/** The attribute itself — the class list names `disabled:` variants too. */
const DISABLED = 'disabled=""';

/** The opening tag of the button with this accessible name. */
function buttonNamed(markup: string, label: string): string {
  return markup.split('<button').find((tag) => tag.includes(`aria-label="${label}"`)) ?? '';
}

describe('BagLineQuantity', () => {
  it.each([{ label: en.bag.decrease }, { label: en.bag.increase }])(
    'keeps $label enabled and says busy while a change is in flight',
    ({ label }) => {
      const button = buttonNamed(markupOf(3, true), label);

      expect(button).toContain('aria-busy="true"');
      expect(button).not.toContain(DISABLED);
    },
  );

  it('writes the count through the locale formatter, not as a bare number (I18N-08)', () => {
    // Grouping is what only the formatter adds, so it is what tells the two apart.
    expect(markupOf(1234, false)).toContain(`>${formatNumber(1234, 'en')}<`);
    expect(formatNumber(1234, 'en')).not.toBe('1234');
  });

  it('disables decrease at one, because a quantity never reaches zero', () => {
    expect(buttonNamed(markupOf(1, false), en.bag.decrease)).toContain(DISABLED);
    expect(buttonNamed(markupOf(1, false), en.bag.increase)).not.toContain(DISABLED);
  });
});
