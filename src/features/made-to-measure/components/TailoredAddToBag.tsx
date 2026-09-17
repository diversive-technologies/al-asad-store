'use client';

import { AddToBagButton } from '@/features/bag/contract';
import { useMessages } from '@/i18n/use-messages';

import type { StudioProduct } from '../lib/studio-product';
import type { MeasurementProfile } from '../schemas/profile.schema';

export interface TailoredAddToBagProps {
  readonly product: StudioProduct;
  /** The profile that was just saved — the VERSION the garment is cut to. */
  readonly profile: MeasurementProfile;
}

/**
 * §34 — the end of the journey the product's fork started: into the bag, cut to
 * the figures that were saved a moment ago.
 *
 * It is the BAG's own button (STRUCT-04, through its contract barrel), not a
 * second one wearing the same label. That button already carries the synchronous
 * double-submit latch, §7.1's refusal wording, the DATA-06 cache set from the
 * response and the panel opening on success; writing a second add path here
 * would be a second implementation of all four (PD-01), and the first defect
 * would be the one nobody remembered to copy.
 *
 * `selections` is empty and `quantity` is 1, which `addToBagRequestSchema`'s own
 * refinement requires: a made-to-measure line has no size to select, and §16's
 * "a size for every piece" invariant is the one thing it is exempt from.
 *
 * `isSoldOut` is false whatever the shelf says, and that is not an oversight.
 * Nothing is taken off the shelf for this line — Phase 6's line holds no
 * reservation at all — so a garment that has run out in every standard size can
 * still be cut to measure, which is precisely when a customer most wants it.
 */
export function TailoredAddToBag({ product, profile }: TailoredAddToBagProps) {
  const messages = useMessages();

  /* The guard that keeps a refusal off the screen rather than explaining it.
     Phase 6's add refuses a profile taken for a style other than the one the
     product is cut as, and the loader already pins the studio to the product's
     style — so this can only differ if a figure saved earlier under another
     style is somehow the one in hand. Offering a button that is certain to be
     refused is worse than not offering it. */
  if (profile.garmentStyle !== product.garmentStyle) return null;

  return (
    <AddToBagButton
      request={{
        productId: product.id,
        selections: [],
        quantity: 1,
        madeToMeasureProfileId: profile.id,
      }}
      isSoldOut={false}
      messages={messages}
      disabledHint={messages.madeToMeasure.productBagHint}
    />
  );
}
