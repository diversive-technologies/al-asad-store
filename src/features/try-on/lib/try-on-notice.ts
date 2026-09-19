import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { assertNever } from '@/lib/result';
import { formatNumber, formatTemplate } from '@/lib/utils/format';

import type { TryOnRequestFailure } from '../api/request-try-on';
import type { TryOnOffer, TryOnResult, TryOnUnavailableReason } from '../schemas/try-on.schema';
import { maxPhotoMegabytes, type PhotoRejection } from './photo';

type TryOnCopy = Messages['tryOn'];

/** What the panel has to say something about. */
export interface TryOnNoticeState {
  readonly rejection: PhotoRejection | null;
  readonly failure: TryOnRequestFailure | null;
  readonly result: TryOnResult | undefined;
}

/** TS-07: a fourth rejection becomes a compile error, not an empty notice. */
function rejectionMessage(
  rejection: PhotoRejection,
  offer: TryOnOffer | null,
  locale: Locale,
  t: TryOnCopy,
): string {
  switch (rejection) {
    case 'EMPTY':
      return t.photoEmpty;
    case 'WRONG_FORMAT':
      return t.photoWrongFormat;
    case 'TOO_LARGE':
      /*
       * TOO_LARGE is only reachable when an offer stated a ceiling, so this
       * branch always has one. The fallback keeps the copy honest rather than
       * printing a bare number if that ever stops being true.
       */
      return offer === null
        ? t.photoWrongFormat
        : formatTemplate(t.photoTooLarge, {
            limit: formatNumber(maxPhotoMegabytes(offer), locale),
          });
    default:
      return assertNever(rejection);
  }
}

/**
 * Three sentences rather than one, because they ask for different things. A
 * feature that is switched off cannot succeed however many times it is asked,
 * so telling that customer to "try again" would be sending them to do something
 * pointless.
 */
function unavailableMessage(reason: TryOnUnavailableReason, t: TryOnCopy): string {
  switch (reason) {
    case 'PROVIDER_DISABLED':
      return t.unavailableDisabled;
    case 'PROVIDER_FAILED':
      return t.unavailableFailed;
    case 'TIMEOUT':
      return t.unavailableTimeout;
    default:
      return assertNever(reason);
  }
}

/**
 * MOD-04 — the one line the panel's live region reads, or `null` when there is
 * nothing to say. A chosen photo that was refused comes first, because it is the
 * one the customer can act on; then a request that never reached the module; then
 * the module's own answer that it could not make an image.
 */
export function tryOnNotice(
  state: TryOnNoticeState,
  offer: TryOnOffer | null,
  locale: Locale,
  messages: Messages,
): string | null {
  const t = messages.tryOn;

  if (state.rejection !== null) return rejectionMessage(state.rejection, offer, locale, t);
  if (state.failure === 'PHOTO_REJECTED') return t.photoWrongFormat;
  if (state.failure === 'FAILED') return t.unavailableFailed;
  if (state.result?.status === 'UNAVAILABLE') return unavailableMessage(state.result.reason, t);
  return null;
}
