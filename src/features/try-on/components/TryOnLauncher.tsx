'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import type { ProductId } from '@/lib/domain/ids';
import { Sparkles } from '@/lib/vendor/icons';

import type { TryOnOffer } from '../schemas/try-on.schema';
import { TryOnPanel } from './TryOnPanel';

export interface TryOnLauncherProps {
  productId: ProductId;
  productName: string;
  /** Null when the backend did not answer, or answered with no provider. */
  offer: TryOnOffer | null;
  locale: Locale;
  messages: Messages;
}

/**
 * The product page's way in to §24, and the whole of the feature's footprint on
 * that page.
 *
 * A CENTRED dialog rather than an edge drawer. A drawer suits a list you scan
 * down — the bag, the filter panel — but this is one task with one thing to
 * look at, and putting it in the middle of the screen means nothing competes
 * with the image the customer came here to see.
 *
 * Being a dialog rather than a route also keeps ADR 12 true in the interface as
 * well as in the architecture: the customer never leaves the product, so
 * dismissing a try-on that failed puts them back at the Add to Bag button
 * rather than somewhere they have to navigate out of.
 */
export function TryOnLauncher({
  productId,
  productName,
  offer,
  locale,
  messages,
}: TryOnLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = messages.tryOn;

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={() => setIsOpen(true)}
        className="w-full"
      >
        {/* A11Y-05: decorative beside a real label, so it is hidden rather than
            described. I18N-05: a sparkle has no direction and must not mirror. */}
        <Sparkles className="me-2 h-4 w-4" aria-hidden />
        {t.launch}
      </Button>

      <p className="text-fg-muted text-center text-xs">{t.launchHint}</p>

      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title={t.title} closeLabel={t.close}>
        {/*
         * Mounted only while open, and that is deliberate rather than
         * incidental: closing the dialog unmounts the hook, which releases the
         * object URL pinning the customer's chosen file and discards the
         * generated image with it. Nothing of either survives the dialog being
         * shut.
         */}
        {isOpen ? (
          <TryOnPanel
            productId={productId}
            productName={productName}
            offer={offer}
            locale={locale}
            messages={messages}
          />
        ) : null}
      </Dialog>
    </div>
  );
}
