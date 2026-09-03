'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/i18n/use-messages';

export interface HomeErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * ERR-09 — a Client Component boundary receiving `{ error, reset }`.
 * SEC-07 / ERR-11 — the caught error is never rendered; user-facing copy comes
 * from SSOT-07. `error` is part of the required signature and is deliberately
 * not displayed.
 */
export default function HomeError({ reset }: HomeErrorProps) {
  const t = useMessages();

  return (
    <div className="p-gutter mx-auto max-w-2xl">
      <ErrorState message={t.errors.unexpected} className="mb-4" />
      <Button variant="secondary" onClick={reset}>
        {t.common.retry}
      </Button>
    </div>
  );
}
