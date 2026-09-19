'use client';

import { useRef, useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import { useObjectUrl } from '@/hooks/use-object-url';
import type { ProductId } from '@/lib/domain/ids';
import { unwrap } from '@/lib/result';

import { requestTryOn, type TryOnRequestFailure } from '../api/request-try-on';
import { checkPhoto, type PhotoRejection } from '../lib/photo';
import type { TryOnOffer, TryOnResult } from '../schemas/try-on.schema';

/**
 * MOD-05 layer 2 — the container. It owns the chosen photograph, the preview,
 * and the one mutation, and it renders nothing.
 */
export interface UseTryOnResult {
  readonly previewUrl: string | null;
  readonly rejection: PhotoRejection | null;
  readonly isPending: boolean;
  readonly canSubmit: boolean;
  readonly result: TryOnResult | undefined;
  readonly failure: TryOnRequestFailure | null;
  readonly choosePhoto: (file: File | null) => void;
  readonly submit: () => void;
  readonly startAgain: () => void;
}

/**
 * The preview is `useObjectUrl`'s: an object URL pins the whole file in memory
 * until it is revoked, and that hook is the one place the store makes and
 * releases one, so the photograph lives exactly as long as it is on screen or
 * waiting to be sent (§24) — replaced, cleared, or gone with the panel.
 *
 * FORM-06 — Generate is latched synchronously: `isPending` reaches React only
 * after a re-render, and two presses queued before it spent two metered
 * generations on one photograph.
 */
export function useTryOn(productId: ProductId, offer: TryOnOffer | null): UseTryOnResult {
  const [photo, setPhoto] = useState<File | null>(null);
  const [rejection, setRejection] = useState<PhotoRejection | null>(null);
  const preview = useObjectUrl();
  const inFlight = useRef(false);

  const mutation = useMutation<TryOnResult, TryOnRequestFailure, File>({
    // DATA-03a: `unwrap` is the only sanctioned Result-to-rejection adapter.
    mutationFn: (chosen) => unwrap(requestTryOn(productId, chosen)),
    onSettled: () => {
      inFlight.current = false;
    },
  });

  function choosePhoto(file: File | null): void {
    mutation.reset();
    preview.release();
    setPhoto(null);
    setRejection(null);
    if (file === null) return;

    /*
     * SEC-03: this is an affordance, not enforcement. It saves a doomed
     * multi-megabyte upload over a mobile connection; the module refuses the same
     * two things again on its own values.
     */
    const checked = checkPhoto({ sizeBytes: file.size, mimeType: file.type }, offer);
    if (!checked.ok) {
      setRejection(checked.error);
      return;
    }

    preview.hold(file);
    setPhoto(file);
  }

  return {
    previewUrl: preview.url,
    rejection,
    isPending: mutation.isPending,
    canSubmit: photo !== null && !mutation.isPending,
    result: mutation.data,
    failure: mutation.error ?? null,
    choosePhoto,
    submit: () => {
      if (photo === null) {
        setRejection('EMPTY');
        return;
      }
      if (inFlight.current) return;
      inFlight.current = true;
      mutation.mutate(photo);
    },
    startAgain: () => {
      choosePhoto(null);
    },
  };
}
