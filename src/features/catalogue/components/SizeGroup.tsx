import { BackInStockOffer, type BackInStockTarget } from '@/features/back-in-stock/contract';

import { soldOutSizes } from '../lib/size-selection';
import { SizeSelector, type SizeSelectorProps } from './SizeSelector';

export interface SizeGroupProps {
  /** Everything the size selector draws — grouped, since it is one thing (CMP-06). */
  selector: SizeSelectorProps;
  /** What this group's sold-out sizes are asked about: the product, or one piece. */
  target: BackInStockTarget;
}

/**
 * One size selector with §28.2's Notify Me under it.
 *
 * Notify Me is offered on exactly the sizes the selector marks sold out, because
 * both read the selector's own `statusOf`: the chips cannot name a size the
 * radios above show as available, or miss one they show as gone.
 *
 * `empty:hidden`, because a one-size piece draws neither — and an empty flex item
 * would still take a gap in the panel.
 */
export function SizeGroup({ selector, target }: SizeGroupProps) {
  return (
    <div className="flex flex-col gap-3 empty:hidden">
      <SizeSelector {...selector} />
      <BackInStockOffer target={target} sizes={soldOutSizes(selector.sizes, selector.statusOf)} />
    </div>
  );
}
