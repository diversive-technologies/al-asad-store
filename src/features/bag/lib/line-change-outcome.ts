import type { Locale } from '@/i18n/locales';
import { assertNever } from '@/lib/result';
import { formatNumber, formatTemplate } from '@/lib/utils/format';

import type { BagError } from '../api/bag-browser';
import type { MoveToWishlistResult, UpdateQuantityResult } from '../schemas/bag-write.schema';
import type { BagLine, BagSummary } from '../schemas/bag.schema';

/**
 * MOD-04 — what the bag does after a change to one of its lines: the words it
 * says, the bag it keeps, and whether focus has to move because the line is gone.
 *
 * Three changes share one latch and one pair of live regions (`useBagLineChanges`),
 * but their answers are different unions — a quantity can run out of stock, and a
 * move into saved items can be refused for a line cut to measure. Each switch ends
 * in `assertNever` (TS-07), so an answer added to either union is a compile error
 * here rather than a change the bag silently reads as done.
 */

/** What a change to one line asked the backend for. */
export type LineChangeRequest =
  | { readonly kind: 'QUANTITY'; readonly quantity: number }
  | { readonly kind: 'REMOVE' }
  /** §16 `moveToWishlist` — out of the bag and into the account's saved items. */
  | { readonly kind: 'MOVE_TO_WISHLIST' };

/** The backend's answer, beside the kind of request it answers. */
export type LineChangeAnswer =
  | { readonly request: 'QUANTITY' | 'REMOVE'; readonly result: UpdateQuantityResult }
  | { readonly request: 'MOVE_TO_WISHLIST'; readonly result: MoveToWishlistResult };

export interface LineChangeOutcome {
  /** The bag the backend answered with, for the cache; `null` when it sent none. */
  readonly summary: BagSummary | null;
  /** A refusal, in our words, for the alert region. */
  readonly notice: string | null;
  /** What just happened, for the polite status region. */
  readonly status: string | null;
  /** The line is no longer in the bag, so focus has to move off the control that went with it. */
  readonly lineLeft: boolean;
  /** The customer's saved items changed on the server, so every read of them is stale. */
  readonly savedItemsChanged: boolean;
}

/** The bag's messages this needs — `messages.bag` satisfies it. */
export interface LineChangeWords {
  /** §7.1 names the piece that failed; `{piece}` and `{size}` are its slots. */
  readonly unavailable: string;
  readonly removedStatus: string;
  /** `{item}` and `{count}` — the quantity the backend now holds for the line. */
  readonly quantityStatus: string;
  readonly movedStatus: string;
  readonly moveNotInBag: string;
  readonly moveNotMovable: string;
  readonly moveSignedOut: string;
  readonly updateFailed: string;
}

const NOTHING: LineChangeOutcome = {
  summary: null,
  notice: null,
  status: null,
  lineLeft: false,
  savedItemsChanged: false,
};

/**
 * @param answer What the backend said, and what it was asked.
 * @param line The line changed: its name for the status that says which line,
 *   and its id to read its new quantity out of the bag that came back.
 */
export function lineChangeOutcome(
  answer: LineChangeAnswer,
  line: Pick<BagLine, 'id' | 'name'>,
  words: LineChangeWords,
  locale: Locale,
): LineChangeOutcome {
  const item = line.name;
  if (answer.request === 'MOVE_TO_WISHLIST') return moveOutcome(answer.result, item, words);

  const { result } = answer;
  switch (result.kind) {
    case 'UNAVAILABLE':
      // §7.1 — the bag stays as it was, and the piece that ran out is named.
      return {
        ...NOTHING,
        notice: formatTemplate(words.unavailable, {
          piece: result.pieceName,
          size: result.sizeLabel,
        }),
      };
    case 'ADDED':
      return answer.request === 'REMOVE'
        ? {
            ...NOTHING,
            summary: result.summary,
            status: formatTemplate(words.removedStatus, { item }),
            lineLeft: true,
          }
        : {
            ...NOTHING,
            summary: result.summary,
            status: quantityStatus(result.summary, line, words, locale),
          };
    default:
      return assertNever(result);
  }
}

/**
 * §30.3 — "bag changes are announced": the count changes in place, and without
 * this a screen-reader user pressing + heard nothing at all. The quantity is the
 * one the BACKEND now holds, read from the bag it answered with, not the one asked.
 */
function quantityStatus(
  summary: BagSummary,
  line: Pick<BagLine, 'id' | 'name'>,
  words: LineChangeWords,
  locale: Locale,
): string | null {
  const now = summary.lines.find((entry) => entry.id === line.id);
  if (now === undefined) return null;
  return formatTemplate(words.quantityStatus, {
    item: line.name,
    count: formatNumber(now.quantity, locale),
  });
}

function moveOutcome(
  result: MoveToWishlistResult,
  item: string,
  words: LineChangeWords,
): LineChangeOutcome {
  switch (result.kind) {
    case 'MOVED':
      return {
        summary: result.summary,
        notice: null,
        status: formatTemplate(words.movedStatus, { item }),
        lineLeft: true,
        savedItemsChanged: true,
      };
    case 'NOT_IN_BAG':
      /* Nothing was saved, and the line is gone all the same: the bag that came
         back no longer has it, so focus still has to move. */
      return { ...NOTHING, summary: result.summary, notice: words.moveNotInBag, lineLeft: true };
    case 'NOT_MOVABLE':
      return { ...NOTHING, notice: words.moveNotMovable };
    default:
      return assertNever(result);
  }
}

/**
 * The words for a change the backend never answered (ERR-11: ours, never the
 * upstream text). A move needs a session, and "try again" is the wrong advice to
 * somebody whose session has ended.
 */
export function lineChangeFailure(
  request: LineChangeRequest['kind'],
  error: BagError,
  words: LineChangeWords,
): string {
  return request === 'MOVE_TO_WISHLIST' && error.kind === 'SIGNED_OUT'
    ? words.moveSignedOut
    : words.updateFailed;
}
