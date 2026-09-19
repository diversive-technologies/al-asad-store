'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

import { useRouter } from 'next/navigation';

import { useSession } from '@/features/auth';
import { useMessages } from '@/i18n/use-messages';
import type { SizeId } from '@/lib/domain/ids';

import {
  backInStockNotice,
  type BackInStockAnswerKind,
  type BackInStockNotice,
  type BackInStockSubject,
} from '../lib/back-in-stock-notice';
import type { BackInStockTarget, SoldOutSize } from '../types';
import { useBackInStockRequest, type BackInStockPress } from './use-back-in-stock-request';

export interface UseBackInStockResult {
  /** Whether a press asks for an address first: a guest, or an account without one. */
  readonly asksForEmail: boolean;
  /** The size whose address form is open — only ever a size still reported sold out. */
  readonly asking: SoldOutSize | null;
  /** The size a request is in flight for. */
  readonly pendingSizeId: SizeId | null;
  readonly notice: BackInStockNotice | null;
  readonly press: (size: SoldOutSize) => void;
  /** Sends the open form's address; answers false when the address was refused. */
  readonly sendEmail: (email: string) => Promise<boolean>;
  readonly closeForm: () => void;
}

/**
 * MOD-05 — §28.2's Notify Me for one group of sizes: who is asking, which size's
 * form is open, and what the answer says.
 *
 * A signed-in customer with an address on the account is asked NOTHING: one
 * press sends the request, and the backend writes to the account's address.
 * Anybody else — a guest, or an account the backend says has no address — gets
 * a form. What the page OFFERS comes from the session; which address is USED is
 * the backend's rule, which is why `EMAIL_REQUIRED` can still turn a press into
 * a form.
 *
 * Focus follows the control the customer was using. When that control goes —
 * the form closes on an answer, or `IN_STOCK` refreshes the sizes and the chip
 * goes with them — focus is handed to the notice rather than dropped on the page.
 */
export function useBackInStock(
  target: BackInStockTarget,
  sizes: readonly SoldOutSize[],
  noticeRef: RefObject<HTMLParagraphElement | null>,
): UseBackInStockResult {
  const words = useMessages().backInStock;
  const session = useSession();
  const router = useRouter();
  const request = useBackInStockRequest(target);
  const [askingId, setAskingId] = useState<SizeId | null>(null);
  const [accountLacksEmail, setAccountLacksEmail] = useState(false);
  const [focusFor, setFocusFor] = useState<BackInStockPress | null>(null);
  const focused = useRef<BackInStockPress | null>(null);

  const { sent, answer } = request;
  const notice =
    sent === null || answer === null
      ? null
      : backInStockNotice(answer, subjectOf(target, sent.size), words);

  // DOM focus is the external system (STATE-04). It waits for the words; once per press.
  useEffect(() => {
    if (focusFor === null || focusFor === focused.current || notice === null) return;
    focused.current = focusFor;
    noticeRef.current?.focus();
  }, [focusFor, notice, noticeRef]);

  function send(press: BackInStockPress): Promise<BackInStockAnswerKind | null> {
    return request.send(press).then((kind) => {
      if (kind === 'EMAIL_REQUIRED') {
        setAccountLacksEmail(true);
        setAskingId(press.size.id);
      } else if (kind === 'RECORDED' || kind === 'ALREADY_RECORDED' || kind === 'IN_STOCK') {
        if (press.email !== null || kind === 'IN_STOCK') setFocusFor(press);
        setAskingId(null);
        // DATA-06 — the overlay this page was drawn with is out of date.
        if (kind === 'IN_STOCK') router.refresh();
      }
      return kind;
    });
  }

  const asksForEmail = !session.isSignedIn || session.email.length === 0 || accountLacksEmail;
  const asking = sizes.find((size) => size.id === askingId) ?? null;

  return {
    asksForEmail,
    asking,
    pendingSizeId: request.isPending ? (sent?.size.id ?? null) : null,
    notice,
    // A chip that opens the form closes it again, as a disclosure does.
    press: (size) => {
      if (asksForEmail) setAskingId((open) => (open === size.id ? null : size.id));
      else void send({ size, email: null });
    },
    // A form with no size behind it has nothing to send, and nothing to refuse.
    sendEmail: (email) =>
      asking === null
        ? Promise.resolve(true)
        : send({ size: asking, email }).then((kind) => kind !== 'INVALID'),
    closeForm: () => {
      setAskingId(null);
    },
  };
}

function subjectOf(target: BackInStockTarget, size: SoldOutSize): BackInStockSubject {
  return {
    productName: target.productName,
    pieceName: target.piece?.name ?? null,
    sizeLabel: size.label,
  };
}
