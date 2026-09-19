'use client';

// I18N-02 exception, stated rather than buried: global-error replaces the root
// layout, so the MessagesProvider that layout seeds does not exist here and
// useMessages() would resolve nothing. Falling back to the default locale is
// exactly what I18N-10 prescribes for content that cannot be resolved. Only its
// two sentences are imported, not the dictionary: this boundary loads with every
// page (PERF-10, `en-root-error.ts`).
import { DEFAULT_LOCALE, DIRECTION } from '@/i18n/locales';
import { enRootError } from '@/i18n/messages/en-root-error';

export interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * ERR-09 / SEC-07 — the caught error is never rendered to the user.
 * This boundary renders its own document because the root layout has failed.
 */
export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang={DEFAULT_LOCALE} dir={DIRECTION[DEFAULT_LOCALE]}>
      <body>
        <div role="alert">
          <p>{enRootError.unexpected}</p>
          <button type="button" onClick={reset}>
            {enRootError.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
