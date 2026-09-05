'use client';

import { useState, type CSSProperties } from 'react';

import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { unwrap } from '@/lib/result';
import { formatMoneyMinor, formatTemplate } from '@/lib/utils/format';

import { applyBagCode, removeBagCode } from '../api/bag-browser';
import type { ApplyCodeResult, BagSummary } from '../schemas/bag.schema';
import { useBag } from './BagProvider';

export interface BagTotalsProps {
  summary: BagSummary;
  locale: Locale;
  messages: Messages;
}

/**
 * §28.2's promotional code and free-delivery progress, plus the totals.
 *
 * DATA-13 throughout: not one number here is computed. The subtotal, the
 * discount, the delivery charge, the total, and how much more the customer must
 * spend for free delivery all arrive from Pricing. The bar below is a rendering
 * of `remainingMinor`, not a calculation from a threshold this file knows.
 */
export function BagTotals({ summary, locale, messages }: BagTotalsProps) {
  const t = messages.bag;
  const { onSummary } = useBag();
  const [rejection, setRejection] = useState<string | null>(null);

  const { pricing, freeDelivery } = summary;

  const code = useMutation({
    mutationFn: (value: string | null) =>
      unwrap(value === null ? removeBagCode() : applyBagCode(value)),
    onSuccess: (result: ApplyCodeResult) => {
      // Whether a code is valid is Pricing's answer, and the REASON is its copy
      // too — this file neither judges the string nor writes the refusal.
      if (result.kind === 'REJECTED') {
        setRejection(result.reason);
        return;
      }

      setRejection(null);
      onSummary(result.summary);
    },
    onError: () => {
      setRejection(t.updateFailed);
    },
  });

  /*
   * The progress bar's width. `Math.min` guards the rendering only — the
   * numbers are the backend's; this cannot report more than a full bar even if
   * a future promotion makes `remainingMinor` exceed the threshold.
   */
  const progressPercent = freeDelivery.isMet
    ? 100
    : Math.min(
        100,
        Math.round(
          ((freeDelivery.thresholdMinor - freeDelivery.remainingMinor) /
            freeDelivery.thresholdMinor) *
            100,
        ),
      );

  return (
    <div className="flex flex-col gap-3">
      {/* §28.2 free-delivery progress. A11Y-06: the bar is never the only
          carrier — the sentence above it says the same thing in words. */}
      <div>
        <p className="text-fg-muted text-xs">
          {freeDelivery.isMet
            ? t.freeDeliveryMet
            : formatTemplate(t.freeDeliveryRemaining, {
                amount: formatMoneyMinor(freeDelivery.remainingMinor, locale),
              })}
        </p>
        <div
          className="bg-surface-strong mt-1.5 h-1 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
          aria-label={t.freeDeliveryMet}
        >
          {/*
           * STY-01a — a genuinely dynamic value that cannot be enumerated at
           * build time, so it is passed as a CSS CUSTOM PROPERTY rather than as
           * a style declaration. The `as` is the TS-03(4) modelling gap: React's
           * `CSSProperties` has no index signature for custom properties.
           */}
          <div
            className="bag-progress bg-brand-600 h-full transition-[inline-size] duration-500 motion-reduce:transition-none"
            style={{ '--bag-progress': `${String(progressPercent)}%` } as CSSProperties}
          />
        </div>
      </div>

      {pricing.appliedCode === null ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get('code');
            if (typeof value === 'string' && value.trim().length > 0) code.mutate(value.trim());
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1">
            {/* FORM-05: labelled, and the error is associated with the field. */}
            <label htmlFor="bag-code" className="text-fg-muted mb-1 block text-xs">
              {t.promoLabel}
            </label>
            <Input
              id="bag-code"
              name="code"
              placeholder={t.promoPlaceholder}
              aria-invalid={rejection !== null}
              aria-describedby={rejection === null ? undefined : 'bag-code-error'}
            />
          </div>
          <Button type="submit" variant="secondary" isLoading={code.isPending}>
            {t.promoApply}
          </Button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-fg-muted">
            {pricing.appliedCode.code} · {pricing.appliedCode.description}
          </span>
          <button
            type="button"
            onClick={() => {
              code.mutate(null);
            }}
            className="text-fg-muted hover:text-fg rounded-card focus-visible:ring-brand-500 underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {t.promoRemove}
          </button>
        </div>
      )}

      {rejection === null ? null : (
        <p id="bag-code-error" role="alert" className="text-danger-500 text-xs">
          {rejection}
        </p>
      )}

      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-fg-muted">{t.subtotal}</dt>
          <dd className="text-fg">{formatMoneyMinor(pricing.subtotalMinor, locale)}</dd>
        </div>

        {pricing.discountMinor === 0 ? null : (
          <div className="flex justify-between">
            <dt className="text-fg-muted">{t.discount}</dt>
            <dd className="text-fg">−{formatMoneyMinor(pricing.discountMinor, locale)}</dd>
          </div>
        )}

        <div className="flex justify-between">
          <dt className="text-fg-muted">{t.delivery}</dt>
          <dd className="text-fg">
            {pricing.deliveryMinor === 0
              ? t.deliveryFree
              : formatMoneyMinor(pricing.deliveryMinor, locale)}
          </dd>
        </div>

        <div className="border-border mt-1 flex justify-between border-t pt-2 font-medium">
          <dt className="text-fg">{t.total}</dt>
          <dd className="text-fg">{formatMoneyMinor(pricing.totalMinor, locale)}</dd>
        </div>
      </dl>
    </div>
  );
}
