'use client';

import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button/button.variants';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import type { ProductId } from '@/lib/domain/ids';
import { assertNever } from '@/lib/result';
import { cn } from '@/lib/utils/cn';
import { formatNumber, formatTemplate } from '@/lib/utils/format';
import { Camera } from '@/lib/vendor/icons';

import { useTryOn } from '../hooks/use-try-on';
import { acceptAttribute, maxPhotoMegabytes, type PhotoRejection } from '../lib/photo';
import type { TryOnOffer, TryOnUnavailableReason } from '../schemas/try-on.schema';
import { TryOnGuidance } from './TryOnGuidance';
import { TryOnLoading } from './TryOnLoading';
import { TryOnResult } from './TryOnResult';

export interface TryOnPanelProps {
  productId: ProductId;
  productName: string;
  /** Null when the backend did not answer, or answered with no provider. */
  offer: TryOnOffer | null;
  locale: Locale;
  messages: Messages;
}

type TryOnCopy = Messages['tryOn'];

/** TS-07: a fourth rejection becomes a compile error, not an empty notice. */
function rejectionMessage(
  rejection: PhotoRejection,
  offer: TryOnOffer | null,
  locale: Locale,
  t: TryOnCopy,
): string {
  switch (rejection) {
    case 'EMPTY':
      return t.photoEmpty;
    case 'WRONG_FORMAT':
      return t.photoWrongFormat;
    case 'TOO_LARGE':
      /*
       * TOO_LARGE is only reachable when an offer stated a ceiling, so this
       * branch always has one. The fallback keeps the copy honest rather than
       * printing a bare number if that ever stops being true.
       */
      return offer === null
        ? t.photoWrongFormat
        : formatTemplate(t.photoTooLarge, {
            limit: formatNumber(maxPhotoMegabytes(offer), locale),
          });
    default:
      return assertNever(rejection);
  }
}

/**
 * Three sentences rather than one, because they ask for different things. A
 * feature that is switched off cannot succeed however many times it is asked,
 * so telling that customer to "try again" would be sending them to do something
 * pointless.
 */
function unavailableMessage(reason: TryOnUnavailableReason, t: TryOnCopy): string {
  switch (reason) {
    case 'PROVIDER_DISABLED':
      return t.unavailableDisabled;
    case 'PROVIDER_FAILED':
      return t.unavailableFailed;
    case 'TIMEOUT':
      return t.unavailableTimeout;
    default:
      return assertNever(reason);
  }
}

/**
 * §28.5's upload flow, as ONE frame with three faces: pick, wait, look.
 *
 * The frame never blanks between them. The stage keeps its 4:5 box whatever is
 * inside it — a prompt, the chosen photo, that photo under a sweep, or the
 * result — so the dialog does not resize under the reader's cursor and nothing
 * jumps as the state changes.
 *
 * MOD-05 layer 3 — every piece of state comes from `useTryOn`; this file decides
 * what is on screen and nothing else.
 */
export function TryOnPanel({ productId, productName, offer, locale, messages }: TryOnPanelProps) {
  const t = messages.tryOn;
  const tryOn = useTryOn(productId, offer);

  if (tryOn.result?.status === 'READY') {
    return (
      <TryOnResult
        image={tryOn.result.image}
        productName={productName}
        messages={messages}
        onStartAgain={tryOn.startAgain}
      />
    );
  }

  /*
   * The waiting state takes over the whole dialog rather than dimming the
   * picker beneath it. There is nothing useful to do while it runs — the
   * controls would all be disabled — and a screen of greyed-out buttons is a
   * worse answer than a screen that is visibly busy.
   *
   * `previewUrl` cannot be null here: `submit` refuses without a photo, so a
   * pending request always has one. The guard keeps that a compile-time fact
   * rather than an assumption.
   */
  if (tryOn.isPending && tryOn.previewUrl !== null) {
    return (
      <div className="flex flex-col gap-4">
        <TryOnLoading previewUrl={tryOn.previewUrl} messages={messages} />

        {/* A11Y-06: ONE spoken announcement for the whole wait. The captions
            inside the loader are aria-hidden so they cannot interrupt it. */}
        <p aria-live="polite" className="text-fg-muted text-center text-xs">
          {t.generatingNote}
        </p>
      </div>
    );
  }

  const notice =
    tryOn.rejection !== null
      ? rejectionMessage(tryOn.rejection, offer, locale, t)
      : tryOn.failure === 'PHOTO_REJECTED'
        ? t.photoWrongFormat
        : tryOn.failure === 'FAILED'
          ? t.unavailableFailed
          : tryOn.result?.status === 'UNAVAILABLE'
            ? unavailableMessage(tryOn.result.reason, t)
            : null;

  return (
    <div className="flex flex-col gap-4">
      {/*
       * Said up front when the backend has told us there is no provider, rather
       * than after a photograph has been chosen and sent. Wasting someone's
       * upload to deliver news we already had would be rude.
       */}
      {offer?.available === false ? (
        <p className="rounded-card bg-surface-muted text-fg-muted p-3 text-xs">
          {t.unavailableDisabled}
        </p>
      ) : null}

      {/*
       * Height-driven rather than width-driven, so the stage stays the same
       * compact box on every screen. Sized to its WIDTH instead, a 4:5 frame in
       * a 28rem dialog is 560px tall and the dialog becomes the page — which is
       * not what a single quick task should feel like.
       */}
      <div className="try-on-stage mx-auto aspect-4/5 h-56">
        {tryOn.previewUrl === null ? (
          <div className="text-fg-muted flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <Camera className="h-7 w-7 opacity-50" aria-hidden />
            <p className="text-sm">{t.intro}</p>
          </div>
        ) : (
          /* An object URL has no origin to optimise either, and the file it
             pins never leaves the browser on this path. */
          <Image
            src={tryOn.previewUrl}
            alt={t.chosenAlt}
            fill
            unoptimized
            className="object-cover"
          />
        )}
      </div>

      {tryOn.previewUrl === null ? <TryOnGuidance messages={messages} /> : null}

      <div className="flex flex-col gap-2">
        {/*
         * The input sits INSIDE the label, so the label names it, the whole
         * control is one click target, and no id has to be threaded between
         * them. `sr-only` rather than `hidden`: it stays focusable and stays in
         * the accessibility tree, and `has-[:focus-visible]` moves the ring onto
         * the part the customer can actually see (A11Y-02, A11Y-03).
         */}
        <label
          className={cn(
            buttonVariants({ variant: 'secondary' }),
            'has-[:focus-visible]:ring-brand-500 cursor-pointer has-[:focus-visible]:ring-2',
          )}
        >
          <Camera className="me-2 h-4 w-4" aria-hidden />
          {tryOn.previewUrl === null ? t.choosePhoto : t.changePhoto}
          <input
            type="file"
            accept={acceptAttribute(offer)}
            className="sr-only"
            onChange={(event) => {
              tryOn.choosePhoto(event.target.files?.[0] ?? null);
              /*
               * Clearing the value is what allows the SAME file to be chosen
               * again after a failure. A file input fires `change` only when the
               * value differs, so re-picking the identical photograph would
               * otherwise do nothing at all and read as a dead button.
               */
              event.target.value = '';
            }}
          />
        </label>

        <Button type="button" onClick={tryOn.submit} disabled={!tryOn.canSubmit}>
          {t.generate}
        </Button>
      </div>

      <p className="text-fg-muted text-xs">{t.fitNotice}</p>

      {/* A11Y-06 / §30.3: an in-place update is announced, not just drawn. The
          element is always present so the region is not created on first use. */}
      <p aria-live="polite" className="text-fg-muted min-h-4 text-xs">
        {notice ?? ''}
      </p>
    </div>
  );
}
