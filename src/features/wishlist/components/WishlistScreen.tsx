'use client';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { useMoveToBag } from '../hooks/use-move-to-bag';
import { WishlistContents } from './WishlistContents';
import { WishlistMoveNotice } from './WishlistMoveNotice';

export interface WishlistScreenProps {
  locale: Locale;
  messages: Messages;
}

/**
 * §28.3's saved items — "save, view, move to bag" — the account's.
 *
 * A CLIENT screen, because the list is read through the BFF the heart writes to,
 * and because the grid it renders is the catalogue's own client card. The list
 * itself belongs to the customer and follows them between devices.
 *
 * Adding a saved product to the bag here MOVES it (`useMoveToBag`). The quick add
 * is the catalogue's own, one unified size for every piece as on any card; what
 * differs is what happens once the bag has taken the product. Elsewhere the bag
 * panel opens over the page. Here the product leaves this list, and the page says
 * so itself, above the list — a modal would make the page behind it inert, and the
 * announcement with it, and a customer moving several saved items would be
 * dismissing a panel between each.
 */
export function WishlistScreen({ locale, messages }: WishlistScreenProps) {
  const move = useMoveToBag(messages);

  return (
    <>
      <WishlistMoveNotice status={move.status} focusRef={move.focusRef} messages={messages} />
      <WishlistContents locale={locale} messages={messages} onAddedToBag={move.moved} />
    </>
  );
}
