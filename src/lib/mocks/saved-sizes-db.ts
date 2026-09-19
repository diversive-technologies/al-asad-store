import type { Locale } from '@/i18n/locales';

import { SIZE_SETS, sizeSetOfSize, type SizeSetRecord } from './size-sets-db';

/**
 * D1 — §28.3's saved sizes, standing in for Java: per ACCOUNT, one current size
 * per SIZE SET.
 *
 * Account-keyed, like the address book and the saved items: a saved size belongs
 * to a customer, and a guest has no account for one to belong to (§2.1 puts
 * "saved sizes" on the Customer row, not the Visitor's).
 *
 * Per size set, because a size only means something against its chart (§6.1): an
 * "M" kameez and a "32" trouser waist are two answers, and a customer can have
 * one of each. The rule that one set holds ONE current size is applied here and
 * nowhere in the storefront (DATA-13) — the interface names a size id, and which
 * set that supersedes is this store's to work out.
 *
 * D6 — an EVENT LOG, so nothing is overwritten and nothing is deleted. Saving
 * appends `SAVED`; forgetting appends `FORGOTTEN`. What is current for a set is
 * its latest event, when that event is a save. "They wore M until March, then L"
 * and "they asked us to forget it" both stay answerable, and no row carries a
 * field that is ever written twice.
 */

interface SizeEvent {
  readonly accountKey: string;
  readonly sizeSetId: string;
  readonly sizeId: string;
  readonly kind: 'SAVED' | 'FORGOTTEN';
  readonly at: string;
}

const EVENTS: SizeEvent[] = [];

/** A saved size as the account read answers it, in one language. */
export interface SavedSizePayload {
  readonly sizeSet: { readonly id: string; readonly name: string };
  readonly size: { readonly id: string; readonly label: string };
  readonly savedAt: string;
}

/** The latest event for one account's set, when that event is a save. */
function currentSave(accountKey: string, sizeSetId: string): SizeEvent | null {
  for (let index = EVENTS.length - 1; index >= 0; index -= 1) {
    const event = EVENTS[index];
    if (event === undefined || event.accountKey !== accountKey) continue;
    if (event.sizeSetId !== sizeSetId) continue;
    return event.kind === 'SAVED' ? event : null;
  }
  return null;
}

function payloadOf(set: SizeSetRecord, event: SizeEvent, locale: Locale): SavedSizePayload[] {
  const size = set.sizes.find((entry) => entry.id === event.sizeId);
  // A size the chart no longer lists is not offered back as one to choose.
  if (size === undefined) return [];
  return [
    {
      sizeSet: { id: set.id, name: set.name[locale] },
      size: { id: size.id, label: size.label[locale] },
      savedAt: event.at,
    },
  ];
}

/**
 * This account's current sizes, one per set at most, in the vocabulary's order —
 * so saving a different size in one chart never re-orders the list under the
 * customer.
 */
export function savedSizesFor(accountKey: string, locale: Locale): SavedSizePayload[] {
  return SIZE_SETS.flatMap((set) => {
    const event = currentSave(accountKey, set.id);
    return event === null ? [] : payloadOf(set, event, locale);
  });
}

/**
 * Saves a size, superseding whatever that size's SET held. `null` for an id that
 * is not a size of any set — the backend's 404.
 *
 * Saving the size that is already current appends nothing: it is not a new fact,
 * and a double press must not make the history say the customer chose it twice.
 */
export function saveSize(
  accountKey: string,
  sizeId: string,
  locale: Locale,
  now: Date = new Date(),
): SavedSizePayload[] | null {
  const found = sizeSetOfSize(sizeId);
  if (found === null) return null;

  if (currentSave(accountKey, found.set.id)?.sizeId !== sizeId) {
    EVENTS.push({
      accountKey,
      sizeSetId: found.set.id,
      sizeId,
      kind: 'SAVED',
      at: now.toISOString(),
    });
  }

  return savedSizesFor(accountKey, locale);
}

/**
 * D6 — records that the customer asked us to forget a size; the save it undoes
 * stays on file.
 *
 * `null` unless the size named is the one CURRENT for its set. Naming the size
 * rather than the set is what keeps a stale page honest: forgetting "M" after
 * another tab changed the set to "L" must not silently forget the "L" the
 * customer never saw.
 */
export function forgetSize(
  accountKey: string,
  sizeId: string,
  locale: Locale,
  now: Date = new Date(),
): SavedSizePayload[] | null {
  const found = sizeSetOfSize(sizeId);
  if (found === null) return null;
  if (currentSave(accountKey, found.set.id)?.sizeId !== sizeId) return null;

  EVENTS.push({
    accountKey,
    sizeSetId: found.set.id,
    sizeId,
    kind: 'FORGOTTEN',
    at: now.toISOString(),
  });

  return savedSizesFor(accountKey, locale);
}

/** Every event ever recorded for one account, forgotten and superseded sizes included. */
export function savedSizeHistoryFor(accountKey: string): readonly SizeEvent[] {
  return EVENTS.filter((event) => event.accountKey === accountKey);
}
