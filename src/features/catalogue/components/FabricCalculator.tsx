'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMetres, formatTemplate } from '@/lib/utils/format';

import { useFabricVerdict } from '../hooks/use-fabric-verdict';
import type { FabricCalculatorOffer, FabricVerdict } from '../schemas/fabric-calculator.schema';

export interface FabricCalculatorProps {
  productId: string;
  offer: FabricCalculatorOffer;
  locale: Locale;
  messages: Messages;
}

interface HeightFieldProps {
  offer: FabricCalculatorOffer;
  label: string;
}

/** The height box; the browser's own `min` and `max` are the offer's bounds. */
function HeightField({ offer, label }: HeightFieldProps) {
  return (
    <div className="min-w-40 flex-1">
      <label htmlFor="fabric-height" className="text-fg mb-1 block text-sm">
        {label}
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
  );
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
 * rot if it were copied here. The read itself is `useFabricVerdict`.
 *
 * FORM-05: every control is labelled. A11Y-01: the style is a real select, and
 * the styles in it are the backend's vocabulary. A11Y-05 / ERR-04: the answer is
 * announced, because a sighted user sees it appear and a screen-reader user
 * otherwise would not know it arrived.
 */
export function FabricCalculator({ productId, offer, locale, messages }: FabricCalculatorProps) {
  const t = messages.product;
  const { verdict, isUnavailable, submit } = useFabricVerdict(productId);

  return (
    <section
      aria-labelledby="fabric-calculator-heading"
      className="rounded-card bg-surface-muted p-6"
    >
      <h2 id="fabric-calculator-heading" className="text-fg text-lg font-medium">
        {t.fabricCalcHeading}
      </h2>
      <p className="text-fg-muted mt-1 text-sm">{t.fabricCalcBody}</p>

      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3">
        <HeightField offer={offer} label={t.fabricCalcHeight} />

        <div className="min-w-48 flex-1">
          <label htmlFor="fabric-style" className="text-fg mb-1 block text-sm">
            {t.fabricCalcStyle}
          </label>
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

      <p aria-live="polite" className="text-fg mt-4 text-sm">
        {isUnavailable ? t.fabricCalcUnavailable : null}
        {verdict === undefined ? null : verdictText(verdict, locale, messages)}
      </p>

      <p className="text-fg-muted mt-2 text-xs">{t.fabricCalcNote}</p>
    </section>
  );
}
