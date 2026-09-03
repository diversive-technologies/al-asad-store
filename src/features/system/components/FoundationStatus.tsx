import { StatusRow } from '@/components/shared/StatusRow';
import { Button } from '@/components/ui/button';
// STRUCT-04: a cross-feature import is legal only through the public barrel.
import { LocaleSwitcher } from '@/features/localisation';
import { DIRECTION, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMoneyMinor } from '@/lib/utils/format';

import type { Health } from '../schemas/health.schema';

export interface FoundationStatusProps {
  health: Health;
  locale: Locale;
  isMocked: boolean;
  messages: Messages;
}

/** A sample amount in minor units (paisa), to exercise the locale formatter. */
const SAMPLE_AMOUNT_MINOR = 1_249_900;

/**
 * Proves the foundation end to end: a Server Component read travelling through
 * the typed client and the mock boundary, copy resolved from SSOT-07, money
 * through the locale formatter, tokens from SSOT-01, and a layout built from
 * logical properties only (I18N-04).
 */
export function FoundationStatus({ health, locale, isMocked, messages }: FoundationStatusProps) {
  const t = messages.foundation;

  return (
    <section className="mx-auto max-w-2xl p-gutter">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-fg">{t.heading}</h1>
        <LocaleSwitcher currentLocale={locale} />
      </header>

      <p className="mb-6 text-fg-muted">{t.body}</p>

      <dl className="mb-6 rounded-card border border-border bg-surface-muted px-4">
        <StatusRow label={t.backendLabel} value={t.backendReachable} />
        <StatusRow label={t.backendVersionLabel} value={health.version} />
        <StatusRow label={t.mockLabel} value={isMocked ? t.mockEnabled : t.mockDisabled} />
        <StatusRow label={t.directionLabel} value={DIRECTION[locale]} />
        <StatusRow
          label={t.sampleAmountLabel}
          value={formatMoneyMinor(SAMPLE_AMOUNT_MINOR, locale)}
        />
      </dl>

      {/* I18N-04: `gap` is direction-agnostic; no ms-/me- needed between siblings. */}
      <div className="flex flex-wrap gap-3">
        <Button variant="primary">{t.primaryAction}</Button>
        <Button variant="secondary">{t.secondaryAction}</Button>
      </div>
    </section>
  );
}

