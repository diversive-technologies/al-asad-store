'use client';

import Image from 'next/image';

import { Button } from '@/components/ui/button';
import type { Messages } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';

import type { TryOnImage } from '../schemas/try-on.schema';

export interface TryOnResultProps {
  image: TryOnImage;
  productName: string;
  messages: Messages;
  onStartAgain: () => void;
}

/**
 * The generated image, shown in the same frame the photo was chosen in.
 *
 * MOD-05 layer 3 — presentational. It receives an image and a callback and owns
 * no state, which is what keeps `TryOnPanel` inside its size ceiling.
 */
export function TryOnResult({ image, productName, messages, onStartAgain }: TryOnResultProps) {
  const t = messages.tryOn;

  return (
    <div className="flex flex-col gap-3">
      {/* A11Y-09: under the dialog's own h2. It names the state rather than the
          feature — "Try it on" is what the header says, and this says the
          asking is over. */}
      <h3 className="text-fg text-sm font-medium">{t.resultHeading}</h3>

      {/*
       * `unoptimized` is required rather than lazy. The source is a data URL
       * held in memory, so there is no origin for the optimiser to fetch — and
       * routing a customer's generated likeness through an image CDN would put
       * a cached copy of it somewhere, which is exactly what §24 forbids.
       * NEXT-09 is still met: explicit dimensions, meaningful alt.
       */}
      <Image
        src={image.dataUrl}
        alt={formatTemplate(t.resultAlt, { product: productName })}
        width={image.widthPx}
        height={image.heightPx}
        unoptimized
        className="rounded-card h-auto w-full"
      />

      {/*
       * The operator's rule, next to the thing it is about. A generated image
       * cannot know whether this customer takes a small or a large, so it must
       * not be left to be read as a fit preview.
       */}
      <p className="text-fg-muted text-xs">{t.fitNotice}</p>

      <Button type="button" variant="secondary" onClick={onStartAgain}>
        {t.startAgain}
      </Button>
    </div>
  );
}
