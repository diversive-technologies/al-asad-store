'use client';

import { useRef } from 'react';

import { useMutation } from '@tanstack/react-query';

import { unwrap } from '@/lib/result';

import { postBackInStock } from '../api/back-in-stock-browser';
import type { BackInStockAnswerKind } from '../lib/back-in-stock-notice';
import type { BackInStockOutcome } from '../schemas/back-in-stock.schema';
import type { BackInStockError, BackInStockTarget, SoldOutSize } from '../types';

/** One request: which size, and the address typed for it — `null` when none was. */
export interface BackInStockPress {
  readonly size: SoldOutSize;
  readonly email: string | null;
}

export interface UseBackInStockRequestResult {
  /**
   * Sends one request and answers what came back, or `null` when a request was
   * already in flight and this one was not sent.
   */
  readonly send: (press: BackInStockPress) => Promise<BackInStockAnswerKind | null>;
  /** The last request sent, in flight or answered; `null` before the first. */
  readonly sent: BackInStockPress | null;
  /** What `sent` answered; `null` while it is in flight or before the first. */
  readonly answer: BackInStockAnswerKind | null;
  readonly isPending: boolean;
}

/**
 * The request half of `useBackInStock`: one POST to our BFF at a time.
 *
 * FORM-06 — a synchronous latch, because `isPending` only becomes true after a
 * re-render and a double tap would otherwise send twice.
 *
 * STATE-02 — nothing about the answer is copied into state: `sent` and `answer`
 * are the mutation's own variables and result, read where they live.
 */
export function useBackInStockRequest(target: BackInStockTarget): UseBackInStockRequestResult {
  const inFlight = useRef(false);

  // `unwrap` rejects with the Result's error value (DATA-03a), so that is the error type.
  const mutation = useMutation<BackInStockOutcome, BackInStockError, BackInStockPress>({
    mutationFn: ({ size, email }) =>
      unwrap(
        postBackInStock({
          productId: target.productId,
          pieceId: target.piece?.id ?? null,
          sizeId: size.id,
          email,
        }),
      ),
  });

  return {
    send: (press) => {
      if (inFlight.current) return Promise.resolve(null);
      inFlight.current = true;
      return mutation
        .mutateAsync(press)
        .then(
          (outcome): BackInStockAnswerKind => outcome.kind,
          (error: BackInStockError): BackInStockAnswerKind => error.kind,
        )
        .finally(() => {
          inFlight.current = false;
        });
    },
    sent: mutation.variables ?? null,
    answer: mutation.isSuccess ? mutation.data.kind : mutation.isError ? mutation.error.kind : null,
    isPending: mutation.isPending,
  };
}
