'use client';

import { useRouter } from 'next/navigation';
import { useId, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Messages } from '@/i18n/messages/en';

import { formatPriceInput, parsePriceInput } from '../lib/price-input';
import { setPriceRange } from '../lib/query-changes';
import { toQueryString } from '../lib/search-params';
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

interface PriceBoxProps {
  id: string;
  name: string;
  label: string;
  valueMinor: number | null;
}

/** One labelled box of the range. FORM-05 / A11Y-04: labelled, not placeholder-hinted. */
function PriceBox({ id, name, label, valueMinor }: PriceBoxProps) {
  return (
    <div className="flex-1">
      <label htmlFor={id} className="text-fg-muted mb-1 block text-xs">
        {label}
      </label>
      <Input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        defaultValue={formatPriceInput(valueMinor)}
      />
    </div>
  );
}

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
 * effect is exactly what STATE-04 prohibits. Each BOX is keyed on the active
 * range instead, so a URL change remounts the two boxes and their defaults are
 * simply read again (STATE-01 rung 1: derive, don't store).
 *
 * The boxes, not the form: keyed as a whole, Apply was remounted by its own
 * navigation, and the keyboard focus it held fell to the page inside the modal
 * drawer, which stays open for a change that alters only the query.
 *
 * CMP-11 — the DOM ids are generated rather than the field names, so no second
 * copy of the panel on a page can make a label point at the wrong box.
 */
export function PriceFilter({ query, basePath, messages }: PriceFilterProps) {
  const router = useRouter();
  // CMP-11 — ids are GENERATED, not the field names; see above.
  const fieldId = useId();
  const t = messages.catalogue;
  const range = `${String(query.priceMinMinor)}-${String(query.priceMaxMinor)}`;

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
        <PriceBox
          key={`${MIN_FIELD}:${range}`}
          id={`${fieldId}-min`}
          name={MIN_FIELD}
          label={t.priceMinLabel}
          valueMinor={query.priceMinMinor}
        />
        <PriceBox
          key={`${MAX_FIELD}:${range}`}
          id={`${fieldId}-max`}
          name={MAX_FIELD}
          label={t.priceMaxLabel}
          valueMinor={query.priceMaxMinor}
        />
      </div>

      <Button type="submit" variant="secondary" size="sm">
        {t.priceApply}
      </Button>
    </form>
  );
}
