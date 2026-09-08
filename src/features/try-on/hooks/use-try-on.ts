'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

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

export function useTryOn(productId: ProductId, offer: TryOnOffer | null): UseTryOnResult {
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rejection, setRejection] = useState<PhotoRejection | null>(null);

  /*
   * An object URL is a document-lifetime resource, not a string: the browser
   * pins the whole file in memory until it is revoked. Held in a ref as well as
   * in state so the cleanup below can reach the CURRENT one without re-running
   * on every change and revoking a URL that is still on screen.
   */
  const previewRef = useRef<string | null>(null);

  const mutation = useMutation<TryOnResult, TryOnRequestFailure, File>({
    // DATA-03a: `unwrap` is the only sanctioned Result-to-rejection adapter.
    mutationFn: (chosen) => unwrap(requestTryOn(productId, chosen)),
  });

  const releasePreview = useCallback((): void => {
    if (previewRef.current !== null) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
  }, []);

  // ERR-05(3)-shaped cleanup: release the pinned file when the panel goes away.
  useEffect(() => releasePreview, [releasePreview]);

  const { reset } = mutation;

  const choosePhoto = useCallback(
    (file: File | null): void => {
      reset();
      releasePreview();
      setPreviewUrl(null);
      setPhoto(null);

      if (file === null) {
        setRejection(null);
        return;
      }

      /*
       * SEC-03: this is an affordance, not enforcement. It saves a doomed
       * multi-megabyte upload over a mobile connection; the module refuses the
       * same two things again on its own values.
       */
      const checked = checkPhoto({ sizeBytes: file.size, mimeType: file.type }, offer);

      if (!checked.ok) {
        setRejection(checked.error);
        return;
      }

      const url = URL.createObjectURL(file);
      previewRef.current = url;

      setRejection(null);
      setPreviewUrl(url);
      setPhoto(file);
    },
    [offer, releasePreview, reset],
  );

  const submit = useCallback((): void => {
    if (photo === null) {
      setRejection('EMPTY');
      return;
    }

    mutation.mutate(photo);
  }, [mutation, photo]);

  const startAgain = useCallback((): void => {
    choosePhoto(null);
  }, [choosePhoto]);

  return {
    previewUrl,
    rejection,
    isPending: mutation.isPending,
    canSubmit: photo !== null && !mutation.isPending,
    result: mutation.data,
    failure: mutation.error ?? null,
    choosePhoto,
    submit,
    startAgain,
  };
}
