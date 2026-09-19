import type { Messages } from '@/i18n/messages/en';
import { assertNever } from '@/lib/result';
import { cn } from '@/lib/utils/cn';

import type { ProductBadgeKind } from '../lib/product-card';

export interface ProductBadgeProps {
  kind: ProductBadgeKind;
  messages: Messages;
}

/**
 * A11Y-06 — colour is never the only carrier of meaning. Each badge states its
 * status in words; the tint is reinforcement, not the message.
 */
function badgeLabel(kind: ProductBadgeKind, t: Messages['product']): string {
  switch (kind) {
    case 'NEW':
      return t.newBadge;
    case 'DISCOUNT':
      return t.discountBadge;
    case 'LOW_STOCK':
      return t.lowStockBadge;
    case 'SOLD_OUT':
      return t.soldOutBadge;
    default:
      // TS-07: adding a badge kind without a label becomes a compile error.
      return assertNever(kind);
  }
}

/*
 * A11Y-07 in both themes. The gold does not move with the theme, so its ink is
 * `on-accent`, which does not either: `text-fg` turns near-white in dark mode and
 * read 2.09:1 on the gold, against 7.7:1 now.
 */
const BADGE_TONE: Record<ProductBadgeKind, string> = {
  NEW: 'bg-brand-600 text-on-brand',
  DISCOUNT: 'bg-accent-500 text-on-accent',
  LOW_STOCK: 'bg-surface-strong text-fg',
  SOLD_OUT: 'bg-fg text-surface',
};

export function ProductBadge({ kind, messages }: ProductBadgeProps) {
  return (
    <span
      className={cn('rounded-pill px-2 py-0.5 text-xs font-medium tracking-wide', BADGE_TONE[kind])}
    >
      {badgeLabel(kind, messages.product)}
    </span>
  );
}
