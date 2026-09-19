import { assertNever } from '@/lib/result';
import { formatTemplate } from '@/lib/utils/format';

import type { AddToBagResult } from '../schemas/bag-write.schema';

/**
 * MOD-04 — the words an add shows for each answer the backend can give, in one
 * place, so every surface that adds to the bag says something for every answer.
 *
 * A switch over the union that ends in `assertNever` (TS-07): a new refusal is a
 * compile error here rather than an answer some button silently reads as
 * "added". That is exactly how a stock add refused on its sizes would otherwise
 * have reached a product page as nothing at all.
 */
export interface AddRefusalWords {
  /** §7.1 names the piece that failed; `{piece}` and `{size}` are its slots. */
  readonly unavailable: string;
  readonly measurementsRefused: string;
  readonly selectionRefused: string;
}

/** The notice for an add's answer, or `null` when it was added. */
export function addNoticeFor(result: AddToBagResult, words: AddRefusalWords): string | null {
  switch (result.kind) {
    case 'ADDED':
      return null;
    case 'UNAVAILABLE':
      return formatTemplate(words.unavailable, {
        piece: result.pieceName,
        size: result.sizeLabel,
      });
    case 'MEASUREMENTS_REFUSED':
      return words.measurementsRefused;
    case 'SELECTION_REFUSED':
      return words.selectionRefused;
    default:
      return assertNever(result);
  }
}
