'use client';

import { useState, type FormEvent } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';
import { formatMetres, formatTemplate } from '@/lib/utils/format';

import { fetchFabricVerdict } from '../api/fetch-fabric-verdict';
import type { FabricCalculatorOffer, FabricVerdict } from '../schemas/fabric-calculator.schema';

export interface FabricCalculatorProps {
  productId: string;
  offer: FabricCalculatorOffer;
  locale: Locale;
  messages: Messages;
}

interface SubmittedQuery {
  heightCm: number;
  styleId: string;
}

function verdictText(verdict: FabricVerdict, locale: Locale, messages: Messages): string {
  const t = messages.product;

  // TS-07: exhaustive over a closed union. A fourth outcome added to §25 becomes
  // a compile error here rather than a blank panel.
  switch (verdict.kind) {
    case 'COMFORTABLE':
      return formatTemplate(t.fabricCalcComfortable, {
        spare: formatMetres(verdict.spareMetres, locale),
      });
    case 'JUST_ENOUGH':
      return t.fabricCalcJustEnough;
    case 'INSUFFICIENT':
      return formatTemplate(t.fabricCalcInsufficient, {
        shortfall: formatMetres(verdict.shortfallMetres, locale),
      });
  }
}

/**
 * §25's Fabric Calculator — "one of the three features no competitor offers".
 *
 * The interface holds no requirement table and performs no subtraction. It
 * collects a height and a style, asks the backend, and renders the verdict it is
 * given (DATA-13). §25 also owns the comfort margin that separates "comfortable"
 * from "just enough", which is exactly the kind of tunable threshold that would
 * rot if it were copied here.
 *
 * "A pure function. No customer input is stored." — so this is a READ keyed on
 * its inputs, not a submission. Nothing is persisted, and re-checking the same
 * height is served from cache rather than asked again.
 *
 * The height is submitted rather than checked per keystroke: someone typing
 * "173" passes through 1 and 17, and telling them their cloth is 3 metres short
 * on the way to a valid answer is worse than telling them nothing.
 */
export function FabricCalculator({ productId, offer, locale, messages }: FabricCalculatorProps) {
  const t = messages.product;
  const [submitted, setSubmitted] = useState<SubmittedQuery | null>(null);

  const verdictQuery = useQuery({
    queryKey: queryKeys.catalogue.fabricVerdict(
      productId,
      submitted?.heightCm ?? 0,
      submitted?.styleId ?? '',
    ),
    queryFn: ({ signal }) =>
      unwrap(
        fetchFabricVerdict(
          { productId, heightCm: submitted?.heightCm ?? 0, styleId: submitted?.styleId ?? '' },
          signal,
        ),
      ),
    enabled: submitted !== null,
    // DATA-09: held for the visit, because re-checking the same height is the
    // common action and the answer cannot change while the page is open.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const height = Number(data.get('heightCm'));
    const styleId = String(data.get('styleId') ?? '');

    // The browser's own `required`/`min`/`max` handle the empty and out-of-range
    // cases; this guards only against a value that is not a number at all.
    if (!Number.isFinite(height) || styleId.length === 0) return;

    setSubmitted({ heightCm: Math.round(height), styleId });
  }

  return (
    <section
      aria-labelledby="fabric-calculator-heading"
      className="rounded-card bg-surface-muted p-6"
    >
      <h2 id="fabric-calculator-heading" className="text-fg text-lg font-medium">
        {t.fabricCalcHeading}
      </h2>
      <p className="text-fg-muted mt-1 text-sm">{t.fabricCalcBody}</p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1">
          {/* FORM-05: every control is labelled. */}
          <label htmlFor="fabric-height" className="text-fg mb-1 block text-sm">
            {t.fabricCalcHeight}
          </label>
          <Input
            id="fabric-height"
            name="heightCm"
            type="number"
            inputMode="numeric"
            required
            min={offer.minHeightCm}
            max={offer.maxHeightCm}
            step={1}
          />
        </div>

        <div className="min-w-48 flex-1">
          <label htmlFor="fabric-style" className="text-fg mb-1 block text-sm">
            {t.fabricCalcStyle}
          </label>
          {/* A11Y-01: a real select. The styles are the backend's vocabulary. */}
          <select
            id="fabric-style"
            name="styleId"
            required
            defaultValue={offer.styles[0]?.id}
            className="rounded-card border-border bg-surface text-fg h-10 w-full border px-3 text-sm"
          >
            {offer.styles.map((style) => (
              <option key={style.id} value={style.id}>
                {style.label}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit">{t.fabricCalcSubmit}</Button>
      </form>

      {/*
       * A11Y-05 / ERR-04: the answer is announced, because a sighted user sees it
       * appear and a screen-reader user otherwise would not know it arrived.
       */}
      <p aria-live="polite" className="text-fg mt-4 text-sm">
        {verdictQuery.isError ? t.fabricCalcUnavailable : null}
        {verdictQuery.data === undefined ? null : verdictText(verdictQuery.data, locale, messages)}
      </p>

      <p className="text-fg-muted mt-2 text-xs">{t.fabricCalcNote}</p>
    </section>
  );
}
