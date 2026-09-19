import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { Wishlist } from '@/features/wishlist/contract';
import { en } from '@/i18n/messages/en';
import { productIdSchema } from '@/lib/domain/ids';

import { WishlistHeart } from './WishlistHeart';

/**
 * A11Y-04 — the heart is a toggle button: ONE name, and `aria-pressed` for the
 * state. It used to flip its name as well, so a saved product was announced as
 * "Remove from wishlist, toggle button, pressed" — two answers to one question.
 */

const PRODUCT = productIdSchema.parse('00000000-0000-4000-8000-0000000000f1');

function heartWhen(isSaved: boolean): string {
  const wishlist: Wishlist = {
    ids: isSaved ? [PRODUCT] : [],
    isReady: true,
    isUnreadable: false,
    isSaved: () => isSaved,
    toggle: () => undefined,
    changeFailed: false,
  };
  return renderToStaticMarkup(
    <WishlistHeart productId={PRODUCT} wishlist={wishlist} messages={en} />,
  );
}

describe('the wishlist heart', () => {
  it.each([
    ['not saved', false, 'false'],
    ['saved', true, 'true'],
  ] as const)('keeps its name and says whether it is pressed when %s', (_case, saved, pressed) => {
    const markup = heartWhen(saved);

    expect(markup).toContain(`aria-label="${en.catalogue.wishlistAdd}"`);
    expect(markup).toContain(`aria-pressed="${pressed}"`);
  });
});
