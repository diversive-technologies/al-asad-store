'use client';

import { useMemo, useRef } from 'react';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import type { ProductId } from '@/lib/domain/ids';
import { cn } from '@/lib/utils/cn';

import { useTryOn } from '../hooks/use-try-on';
import { useTryOnFocus, type TryOnFocusElements } from '../hooks/use-try-on-focus';
import { tryOnFaceOf, tryOnStatusOf } from '../lib/try-on-face';
import { tryOnNotice } from '../lib/try-on-notice';
import type { TryOnOffer } from '../schemas/try-on.schema';
import { TryOnLoading } from './TryOnLoading';
import { TryOnPicker } from './TryOnPicker';
import { TryOnResult } from './TryOnResult';

export interface TryOnPanelProps {
  productId: ProductId;
  productName: string;
  /** Null when the backend did not answer, or answered with no provider. */
  offer: TryOnOffer | null;
  locale: Locale;
  messages: Messages;
}

/**
 * §28.5's upload flow, as ONE frame with three faces: pick, wait, look.
 *
 * The frame never blanks between them. The stage keeps its 4:5 box whatever is
 * inside it — a prompt, the chosen photo, that photo under a sweep, or the
 * result — so the dialog does not resize under the reader's cursor and nothing
 * jumps as the state changes.
 *
 * The waiting state takes over the whole dialog rather than dimming the picker
 * beneath it: there is nothing useful to do while it runs, and a screen of
 * greyed-out buttons is a worse answer than a screen that is visibly busy.
 *
 * Every change of face removes the control that had focus, so the panel hands
 * it on (`useTryOnFocus`, A11Y-08), and ONE status line outlives the faces
 * (A11Y-05, §30.3): the wait, a refused photo and a failure are updates to a
 * region that already exists, rather than words a new region was created
 * holding, which screen readers do not announce.
 *
 * MOD-05 layer 3 — every piece of state comes from `useTryOn`; this file decides
 * which face is on screen and nothing else.
 */
export function TryOnPanel({ productId, productName, offer, locale, messages }: TryOnPanelProps) {
  const tryOn = useTryOn(productId, offer);
  const face = tryOnFaceOf(tryOn);

  const statusRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const generateRef = useRef<HTMLButtonElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const focusable = useMemo<TryOnFocusElements>(
    () => ({
      STATUS: statusRef,
      RESULT_HEADING: headingRef,
      GENERATE: generateRef,
      PHOTO_INPUT: photoInputRef,
    }),
    [],
  );
  useTryOnFocus(face.kind, tryOn.previewUrl !== null, focusable);

  const status = tryOnStatusOf(face, tryOnNotice(tryOn, offer, locale, messages), messages.tryOn);

  return (
    <div className="flex flex-col gap-4">
      {face.kind === 'RESULT' ? (
        <TryOnResult
          picture={face.picture}
          productName={productName}
          messages={messages}
          onStartAgain={tryOn.startAgain}
          headingRef={headingRef}
        />
      ) : face.kind === 'PENDING' ? (
        <TryOnLoading previewUrl={face.previewUrl} messages={messages} />
      ) : (
        <TryOnPicker
          tryOn={tryOn}
          offer={offer}
          messages={messages}
          generateRef={generateRef}
          photoInputRef={photoInputRef}
        />
      )}

      {/* The one spoken line: the loader's captions are aria-hidden so nothing
          interrupts it. Focus waits here while the image is made. */}
      <p
        ref={statusRef}
        role="status"
        tabIndex={-1}
        className={cn(
          'text-fg-muted min-h-4 text-xs',
          face.kind === 'PENDING' && 'text-center',
          face.kind === 'RESULT' && 'empty:hidden',
        )}
      >
        {status}
      </p>
    </div>
  );
}
