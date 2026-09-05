'use client';

import { useRouter } from 'next/navigation';
import { useId, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Messages } from '@/i18n/messages/en';

import { formatPriceInput, parsePriceInput } from '../lib/price-input';
import { setPriceRange, toQueryString } from '../lib/search-params';
import type { CatalogueQuery } from '../schemas/search.schema';

export interface PriceFilterProps {
  query: CatalogueQuery;
  basePath: string;
  messages: Messages;
}

/*
 * The FORM field names, which are fixed because `FormData.get` reads them and
 * they mirror the query parameters. The DOM ids are a separate matter — see
 * `useId` below.
 */
const MIN_FIELD = 'priceMin';
const MAX_FIELD = 'priceMax';

/** `FormData.get` may return a `File`; a price box never does, but narrow anyway. */
function fieldValue(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}

/**
 * MOD-06 — the ONLY client boundary in the filter panel, and the smallest leaf
 * that needs one.
 *
 * Every other filter is a link, because toggling it is a single discrete
 * navigation. A range is not: it is two values that are only meaningful once
 * both have been typed, so it needs a submit and therefore a handler. Section
 * 28.1's "instant apply" is satisfied by the link filters; a range that
 * navigated on every keystroke would fire a request per digit.
 *
 * The boxes are UNCONTROLLED. A controlled input seeded from `query` would go
 * stale the moment the URL changed by another route — removing the price chip
 * would leave the old numbers sitting in the boxes — and re-syncing it with an
 * effect is exactly what STATE-04 prohibits. The caller instead gives this
 * component a `key` derived from the active range, so a URL change remounts it
 * and the defaults are simply read again (STATE-01 rung 1: derive, don't store).
 */
export function PriceFilter({ query, basePath, messages }: PriceFilterProps) {
  const router = useRouter();
  /*
   * CMP-11 — ids are GENERATED, not the field names.
   *
   * The panel renders twice on a small screen: once in the rail that CSS hides,
   * and once inside the filter drawer. Fixed ids would be duplicated across the
   * two, and every `htmlFor` would then point at whichever came first — so the
   * drawer's labels would focus the hidden rail's inputs.
   */
  const fieldId = useId();
  const minId = `${fieldId}-min`;
  const maxId = `${fieldId}-max`;
  const t = messages.catalogue;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const minMinor = parsePriceInput(fieldValue(data, MIN_FIELD));
    const maxMinor = parsePriceInput(fieldValue(data, MAX_FIELD));

    // An inverted range is corrected on the way back in by
    // `parseCatalogueQuery`, so it is not re-checked here (PD-01).
    router.push(`${basePath}${toQueryString(setPriceRange(query, minMinor, maxMinor))}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 px-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          {/* FORM-05 / A11Y-04: every box is labelled, not placeholder-hinted. */}
          <label htmlFor={minId} className="text-fg-muted mb-1 block text-xs">
            {t.priceMinLabel}
          </label>
          <Input
            id={minId}
            name={MIN_FIELD}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={formatPriceInput(query.priceMinMinor)}
          />
        </div>

        <div className="flex-1">
          <label htmlFor={maxId} className="text-fg-muted mb-1 block text-xs">
            {t.priceMaxLabel}
          </label>
          <Input
            id={maxId}
            name={MAX_FIELD}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={formatPriceInput(query.priceMaxMinor)}
          />
        </div>
      </div>

      <Button type="submit" variant="secondary" size="sm">
        {t.priceApply}
      </Button>
    </form>
  );
}
