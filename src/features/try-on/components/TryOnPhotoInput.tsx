'use client';

import type { Ref } from 'react';

import { buttonVariants } from '@/components/ui/button/button.variants';
import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { Camera } from '@/lib/vendor/icons';

import { acceptAttribute } from '../lib/photo';
import type { TryOnOffer } from '../schemas/try-on.schema';

export interface TryOnPhotoInputProps {
  hasPhoto: boolean;
  offer: TryOnOffer | null;
  onChoose: (file: File | null) => void;
  messages: Messages;
  /** Where the panel puts focus when it comes back with no photo chosen (A11Y-08). */
  inputRef: Ref<HTMLInputElement>;
}

/**
 * The photo picker, drawn as a button.
 *
 * The input sits INSIDE its label, so the label names it, the whole control is
 * one click target, and no id has to be threaded between them. `sr-only` rather
 * than `hidden`: it stays focusable and in the accessibility tree, and
 * `has-[:focus-visible]` moves the ring onto the part the customer can see
 * (A11Y-02, A11Y-03).
 *
 * Its value is cleared after each choice, because a file input fires `change`
 * only when the value differs — re-picking the same photograph after a failure
 * would otherwise do nothing at all and read as a dead button.
 */
export function TryOnPhotoInput({
  hasPhoto,
  offer,
  onChoose,
  messages,
  inputRef,
}: TryOnPhotoInputProps) {
  const t = messages.tryOn;

  return (
    <label
      className={cn(
        buttonVariants({ variant: 'secondary' }),
        'has-[:focus-visible]:ring-brand-500 cursor-pointer has-[:focus-visible]:ring-2',
      )}
    >
      <Camera className="me-2 h-4 w-4" aria-hidden />
      {hasPhoto ? t.changePhoto : t.choosePhoto}
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute(offer)}
        className="sr-only"
        onChange={(event) => {
          onChoose(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />
    </label>
  );
}
