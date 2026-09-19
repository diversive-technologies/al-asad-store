import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { assertNever } from '@/lib/result';
import { formatMoneyMinor, formatTemplate } from '@/lib/utils/format';

import type { ActiveFilter } from './active-filters';

/**
 * MOD-04 — the user-visible wording for an applied filter, resolved against
 * SSOT-07.
 *
 * It lives apart from `active-filters.ts` on purpose: that module is pure of copy
 * and has no locale, and putting English in it would embed words in a layer that
 * cannot translate them (I18N-01). It hands over the facts; this names them.
 *
 * One definition, because two surfaces say it: the removable chip, and the
 * polite announcement that tells a screen-reader user what the listing now holds
 * (PD-01).
 */
export function activeFilterLabel(chip: ActiveFilter, locale: Locale, messages: Messages): string {
  const t = messages.catalogue;

  switch (chip.kind) {
    case 'collection':
    case 'facet':
      // Already localised by the backend — fabric and colour are protected
      // vocabularies and must be rendered exactly as supplied (I18N-09).
      return chip.label;

    case 'price': {
      const min = chip.minMinor === null ? null : formatMoneyMinor(chip.minMinor, locale);
      const max = chip.maxMinor === null ? null : formatMoneyMinor(chip.maxMinor, locale);

      // I18N-06: three whole parameterised messages, never a sentence built by
      // gluing "From" to a number to "to" to another number.
      if (min !== null && max !== null) return formatTemplate(t.priceRange, { min, max });
      if (min !== null) return formatTemplate(t.priceFrom, { min });
      if (max !== null) return formatTemplate(t.priceUpTo, { max });

      // Unreachable: a price chip is only emitted when a bound is set.
      return t.filterPrice;
    }

    case 'inStock':
      return t.inStockOnly;

    default:
      // TS-07: a new chip kind without wording is a compile error, not a blank.
      return assertNever(chip);
  }
}
