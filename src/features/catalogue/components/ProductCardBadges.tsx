import type { Messages } from '@/i18n/messages/en';

import type { ProductBadgeKind } from '../lib/product-card';
import { ProductBadge } from './ProductBadge';

export interface ProductCardBadgesProps {
  badges: readonly ProductBadgeKind[];
  messages: Messages;
}

/**
 * The card's status badges, in the reading-start corner of the photograph.
 *
 * I18N-04: `start-3` is logical, so the badges hug the reading-start corner in
 * both directions. `end-12` keeps the strip clear of the action column at EVERY
 * tile width: a badge states its status in words and the tint is only
 * reinforcement (A11Y-06), so a word disappearing under the disc is the message
 * disappearing — and at three columns on a 375px screen "Low stock" was reading
 * as "Low s". Bounded, it wraps inside its own pill instead.
 */
export function ProductCardBadges({ badges, messages }: ProductCardBadgesProps) {
  if (badges.length === 0) return null;

  return (
    <ul className="absolute start-3 end-12 top-3 flex flex-wrap gap-1">
      {badges.map((badge) => (
        <li key={badge}>
          <ProductBadge kind={badge} messages={messages} />
        </li>
      ))}
    </ul>
  );
}
