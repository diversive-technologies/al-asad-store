'use client';

import type { Ref } from 'react';

import Image from 'next/image';

import { Button } from '@/components/ui/button';
import type { Messages } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';

import type { TryOnPicture } from '../lib/try-on-face';

export interface TryOnResultProps {
  picture: TryOnPicture;
  productName: string;
  messages: Messages;
  onStartAgain: () => void;
  /** Where the panel puts focus when the image arrives (A11Y-08). */
  headingRef: Ref<HTMLHeadingElement>;
}

/**
 * The image that came back, shown in the same frame the photo was chosen in.
 *
 * A generated image is headed and described as the customer in the piece. A
 * SAMPLE is not one — it is the catalogue photograph of the model the piece was
 * shot on — so its heading, its alt text and a visible line all say so. A
 * photograph of a stranger captioned "You in this piece" would be the page lying
 * about the one thing the customer came to see.
 *
 * MOD-05 layer 3 — presentational. It receives an image and a callback and owns
 * no state. Its heading takes focus when the image arrives, so the result is
 * announced where the customer is rather than drawn in silence (`TryOnPanel`).
 */
export function TryOnResult({
  picture,
  productName,
  messages,
  onStartAgain,
  headingRef,
}: TryOnResultProps) {
  const t = messages.tryOn;
  const isSample = picture.status === 'SAMPLE';

  return (
    <div className="flex flex-col gap-3">
      {/* A11Y-09: under the dialog's own h2. It names the state rather than the
          feature — "Try it on" is what the header says. */}
      <h3 ref={headingRef} tabIndex={-1} className="text-fg text-sm font-medium">
        {isSample ? t.sampleHeading : t.resultHeading}
      </h3>

      {isSample ? (
        <p className="rounded-card bg-surface-muted text-fg p-3 text-xs">{t.sampleLabel}</p>
      ) : null}

      {/*
       * `unoptimized` is required rather than lazy. The source is a data URL
       * held in memory, so there is no origin for the optimiser to fetch — and
       * routing a customer's generated likeness through an image CDN would put
       * a cached copy of it somewhere, which is exactly what §24 forbids.
       * NEXT-09 is still met: explicit dimensions, meaningful alt.
       */}
      <Image
        src={picture.image.dataUrl}
        alt={formatTemplate(isSample ? t.sampleAlt : t.resultAlt, { product: productName })}
        width={picture.image.widthPx}
        height={picture.image.heightPx}
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
