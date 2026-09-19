'use client';

import { useCallback, useRef, useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import type { Messages } from '@/i18n/messages/en';
import { unwrap } from '@/lib/result';

import { applyBagCode, removeBagCode } from '../api/bag-browser';
import { useBag } from '../components/BagProvider';
import { codeStatusFor } from '../lib/code-status';
import type { ApplyCodeResult } from '../schemas/bag-write.schema';

export interface BagCode {
  /** Applies a code, or lifts the one applied when given `null`. */
  change: (code: string | null) => void;
  isPending: boolean;
  /** Pricing's reason for refusing a code, or our words for a failed request. */
  rejection: string | null;
  /** What just happened, for a polite live region. */
  status: string | null;
  /**
   * For the control that REPLACES the one pressed: the code field after a lift,
   * Remove code after an apply. It takes focus as it mounts, and only then.
   */
  takeFocus: (control: HTMLElement | null) => void;
}

/**
 * §16 `applyCode` and its removal. Whether a code is valid, and the REASON it is
 * not, are Pricing's answers (DATA-13): this neither judges the string nor writes
 * the refusal.
 *
 * Applying and lifting SWAP the form for the applied code, so the control that
 * was pressed leaves the document. Focus is handed to the control that took its
 * place as that one mounts (`takeFocus`), and what happened is said in words
 * (§30.3) — it used to fall to the page, in silence, inside a modal panel.
 *
 * FORM-06 — a synchronous latch, so Apply can stay ENABLED while a change is in
 * flight: a disabled button drops the focus it holds (§30.3).
 */
export function useBagCode(messages: Messages): BagCode {
  const t = messages.bag;
  const { onSummary } = useBag();
  const [rejection, setRejection] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const inFlight = useRef(false);
  const swapped = useRef(false);

  const code = useMutation({
    mutationFn: (value: string | null) =>
      unwrap(value === null ? removeBagCode() : applyBagCode(value)),
    onSuccess: (result: ApplyCodeResult) => {
      if (result.kind === 'REJECTED') return setRejection(result.reason);
      setRejection(null);
      setStatus(codeStatusFor(result.summary.pricing.appliedCode, t));
      swapped.current = true;
      // DATA-06 — the answer IS the refreshed bag.
      onSummary(result.summary);
    },
    // ERR-11 / SEC-07: our copy, never the upstream error text.
    onError: () => {
      setRejection(t.updateFailed);
    },
  });

  // A ref callback, not an effect: it runs as the new control enters the document.
  const takeFocus = useCallback((control: HTMLElement | null) => {
    if (control === null || !swapped.current) return;
    swapped.current = false;
    control.focus();
  }, []);

  return {
    change: (value) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setStatus(null);
      code.mutate(value, {
        onSettled: () => {
          inFlight.current = false;
        },
      });
    },
    isPending: code.isPending,
    rejection,
    status,
    takeFocus,
  };
}
