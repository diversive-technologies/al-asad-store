import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SessionProvider } from '@/features/auth';
import { en } from '@/i18n/messages/en';

import { bagLineSchema, type BagLine } from '../schemas/bag.schema';
import { BagLineMoveButton } from './BagLineMoveButton';

/**
 * §16 `moveToWishlist` is offered on exactly the lines it can work on: a stock
 * line, for a signed-in customer. A guest has no saved list to move into (§28.3),
 * and a cut line would lose the measurements it is cut to.
 */

const STOCK_LINE = {
  id: 'a1b2c3d4-0001-4c8a-8f21-000000000001',
  productId: 'b1b2c3d4-0001-4c8a-8f21-000000000001',
  slug: 'plain-waistcoat-suit',
  name: 'Plain Waistcoat Suit',
  imageUrl: '/products/example.avif',
  type: 'SIMPLE',
  quantity: 1,
  unitPriceMinor: 700_000,
  lineTotalMinor: 700_000,
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
};

const CUT_LINE = {
  ...STOCK_LINE,
  pieces: [],
  reservationExpiresAt: null,
  stitching: {
    garmentStyle: 'KAMEEZ_SHALWAR',
    styleLabel: 'Kameez shalwar',
    profileId: 'e1b2c3d4-0001-4c8a-8f21-000000000001',
    savedAt: '2026-09-16T10:00:00.000Z',
    figureCount: 8,
    measurementsChanged: false,
    chargeMinor: 250_000,
    leadTimeDays: 7,
  },
  movableToWishlist: false,
};

const SESSION = { displayName: 'Test Customer', email: 'customer@example.com', mobile: '' };

function markupFor(line: BagLine, signedIn: boolean, isBusy = false): string {
  return renderToStaticMarkup(
    <SessionProvider session={signedIn ? SESSION : null}>
      <BagLineMoveButton line={line} messages={en} isBusy={isBusy} onMove={() => true} />
    </SessionProvider>,
  );
}

describe('BagLineMoveButton', () => {
  it.each([
    ['a stock line, signed in', bagLineSchema.parse(STOCK_LINE), true, true],
    ['a stock line, as a guest', bagLineSchema.parse(STOCK_LINE), false, false],
    ['a line cut to measure, signed in', bagLineSchema.parse(CUT_LINE), true, false],
  ])('decides whether to offer the move on %s', (_label, line, signedIn, offered) => {
    expect(markupFor(line, signedIn).includes(en.bag.moveToSaved)).toBe(offered);
  });

  it('stays enabled and says busy while a change is in flight', () => {
    const markup = markupFor(bagLineSchema.parse(STOCK_LINE), true, true);

    expect(markup).toContain('aria-busy="true"');
    expect(markup).not.toContain('disabled=""');
  });
});
