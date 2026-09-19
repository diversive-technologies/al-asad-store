'use client';

import type { Ref } from 'react';

import Image from 'next/image';

import { Button } from '@/components/ui/button';
import type { Messages } from '@/i18n/messages/en';
import { Camera } from '@/lib/vendor/icons';

import type { UseTryOnResult } from '../hooks/use-try-on';
import type { TryOnOffer } from '../schemas/try-on.schema';
import { TryOnGuidance } from './TryOnGuidance';
import { TryOnPhotoInput } from './TryOnPhotoInput';

export interface TryOnPickerProps {
  tryOn: UseTryOnResult;
  offer: TryOnOffer | null;
  messages: Messages;
  /** The two controls the panel hands focus back to (A11Y-08) — see `focusTargetFor`. */
  generateRef: Ref<HTMLButtonElement>;
  photoInputRef: Ref<HTMLInputElement>;
}

/**
 * The panel's first face: choose a photograph and ask.
 *
 * Said up front when the backend has told us there is no provider, rather than
 * after a photograph has been chosen and sent — wasting someone's upload to
 * deliver news we already had would be rude.
 *
 * The stage is height-driven rather than width-driven, so it stays the same
 * compact box on every screen: sized to its WIDTH, a 4:5 frame in a 28rem dialog
 * is 560px tall and the dialog becomes the page. An object URL has no origin to
 * optimise, and the file it pins never leaves the browser on this path.
 *
 * A11Y-06 / §30.3: what the picker has to say — a refused photo, a failure — is
 * read from the PANEL's status line, which outlives this face. The picker is
 * unmounted while an image is made, so a region of its own was created again
 * already holding its words, which screen readers do not announce.
 */
export function TryOnPicker({
  tryOn,
  offer,
  messages,
  generateRef,
  photoInputRef,
}: TryOnPickerProps) {
  const t = messages.tryOn;

  return (
    <div className="flex flex-col gap-4">
      {offer?.available === false ? (
        <p className="rounded-card bg-surface-muted text-fg-muted p-3 text-xs">
          {t.unavailableDisabled}
        </p>
      ) : null}

      <div className="try-on-stage mx-auto aspect-4/5 h-56">
        {tryOn.previewUrl === null ? (
          <div className="text-fg-muted flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <Camera className="h-7 w-7 opacity-50" aria-hidden />
            <p className="text-sm">{t.intro}</p>
          </div>
        ) : (
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
        <TryOnPhotoInput
          hasPhoto={tryOn.previewUrl !== null}
          offer={offer}
          onChoose={tryOn.choosePhoto}
          messages={messages}
          inputRef={photoInputRef}
        />
        <Button ref={generateRef} type="button" onClick={tryOn.submit} disabled={!tryOn.canSubmit}>
          {t.generate}
        </Button>
      </div>

      <p className="text-fg-muted text-xs">{t.fitNotice}</p>
    </div>
  );
}
