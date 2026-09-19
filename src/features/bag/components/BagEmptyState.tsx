import type { Ref } from 'react';

import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

export interface BagEmptyStateProps {
  messages: Messages;
  /** Where focus lands once the last line has been removed. */
  ref?: Ref<HTMLParagraphElement>;
}

/**
 * An empty bag, and the way back into the shop.
 *
 * The sentence takes focus (`tabIndex -1`) when the last line is removed, so a
 * keyboard or screen-reader user who has just emptied the bag lands on the words
 * that say so rather than on the top of the page. It is not in the tab order.
 */
export function BagEmptyState({ messages, ref }: BagEmptyStateProps) {
  const t = messages.bag;

  return (
    <div className="py-8 text-center">
      <p ref={ref} tabIndex={-1} className="text-fg-muted text-sm">
        {t.emptyBody}
      </p>
      <div className="mt-4">
        <ButtonLink href={ROUTES.catalogue.list} variant="secondary">
          {t.startShopping}
        </ButtonLink>
      </div>
    </div>
  );
}
