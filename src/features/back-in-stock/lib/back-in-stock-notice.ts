import type { Messages } from '@/i18n/messages/en';
import { assertNever } from '@/lib/result';
import { formatTemplate } from '@/lib/utils/format';

import type { BackInStockOutcome } from '../schemas/back-in-stock.schema';
import type { BackInStockError } from '../types';

/**
 * MOD-04 — pure, React-free. What a Notify Me answer SAYS to the customer.
 *
 * Kept out of the components so every answer is tested for its words, and so a
 * new answer kind is a compile error here (TS-07) rather than a silent blank line.
 */

/** Any answer a press can come back with: the backend's outcome, or our failure. */
export type BackInStockAnswerKind = BackInStockOutcome['kind'] | BackInStockError['kind'];

/** What the answer was about, as the page names it. */
export interface BackInStockSubject {
  readonly productName: string;
  /** `null` when the request was about the product as a whole. */
  readonly pieceName: string | null;
  readonly sizeLabel: string;
}

/**
 * `status` is polite and is how every ordinary answer is told; `alert` is kept
 * for the two that mean the request did NOT go through.
 */
export interface BackInStockNotice {
  readonly role: 'status' | 'alert';
  readonly text: string;
}

/**
 * The sentence for an answer, or `null` when another part of the page says it:
 * `EMAIL_REQUIRED` opens the address form, whose own lead asks for one, and
 * `INVALID` goes on the address field itself (FORM-04).
 *
 * I18N-06 — each sentence is ONE parameterised message. A piece is named in its
 * own sentence rather than spliced into the product's, because where the piece
 * goes is the language's decision. Names are passed exactly as served (I18N-09).
 */
export function backInStockNotice(
  kind: BackInStockAnswerKind,
  subject: BackInStockSubject,
  words: Messages['backInStock'],
): BackInStockNotice | null {
  const values = {
    product: subject.productName,
    piece: subject.pieceName ?? '',
    size: subject.sizeLabel,
  };
  const isPiece = subject.pieceName !== null;

  switch (kind) {
    case 'RECORDED':
      return status(isPiece ? words.recordedPiece : words.recordedProduct, values);
    case 'ALREADY_RECORDED':
      return status(isPiece ? words.alreadyPiece : words.alreadyProduct, values);
    case 'IN_STOCK':
      return status(words.inStock, values);
    case 'NOT_OFFERED':
      return { role: 'alert', text: formatTemplate(words.notOffered, values) };
    case 'UNREACHABLE':
      return { role: 'alert', text: words.unreachable };
    case 'EMAIL_REQUIRED':
      return null;
    case 'INVALID':
      return null;
    default:
      return assertNever(kind);
  }
}

function status(template: string, values: Readonly<Record<string, string>>): BackInStockNotice {
  return { role: 'status', text: formatTemplate(template, values) };
}
