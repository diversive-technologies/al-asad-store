'use client';

import { useState, type ReactNode } from 'react';

import { Dialog } from '@/components/ui/dialog';
import { useMessages } from '@/i18n/use-messages';

export interface SizeGuideProps {
  /**
   * The guide itself, rendered on the server and handed down as a slot — the
   * Content feature's to draw, not this one's (MOD-01). See `ProductScreen`.
   */
  content: ReactNode;
}

/**
 * §28.2's size guide, opened from beside a size selector: a button, and the
 * dialog it opens over the product page.
 *
 * A DIALOG rather than a link, because a link would take the customer off the page
 * and away from the sizes they had already chosen for every piece. `Dialog` is the
 * native `<dialog>`, so the focus trap, `Escape`, focus back on this button and
 * the inert page behind come from the platform (A11Y-08).
 *
 * The guide is not put in the page until it is first asked for, and stays once it
 * has been. Not before, because a closed dialog's words are still in the page's
 * markup — a set's two openers would draw the whole guide twice, and every product
 * page would carry it as hidden text. Kept after, so closing it plays its exit
 * with the guide still inside rather than as an emptying card.
 *
 * A text button rather than a pill: it sits on the same line as a legend and must
 * not read as one of the sizes. `min-h-8` makes it a 32px target on a phone;
 * `-me-2` gives the padding back so the WORD, not the box, lines up with the end
 * of the sizes below.
 */
export function SizeGuide({ content }: SizeGuideProps) {
  const messages = useMessages();
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setHasOpened(true);
          setIsOpen(true);
        }}
        className="text-fg rounded-card -me-2 inline-flex min-h-8 items-center px-2 text-xs font-medium underline decoration-1 underline-offset-4"
      >
        {messages.product.sizeGuide}
      </button>

      <Dialog
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        title={messages.product.sizeGuide}
        closeLabel={messages.common.close}
      >
        {hasOpened ? content : null}
      </Dialog>
    </>
  );
}
