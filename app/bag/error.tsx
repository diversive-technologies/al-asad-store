'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/i18n/use-messages';

export interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * ERR-09 — a Client Component boundary receiving `{ error, reset }`.
 * SEC-07 / ERR-11 — the caught error is never rendered; copy comes from SSOT-07.
 *
 * A bag that cannot be READ is not this: the contents say so themselves. This
 * catches what nothing anticipated, so it no longer escapes to the root boundary.
 */
export default function RouteError({ reset }: RouteErrorProps) {
  const t = useMessages();

  return (
    <div className="page-shell py-16">
      <ErrorState message={t.errors.unexpected} className="mb-4" />
      <Button variant="secondary" onClick={reset}>
        {t.common.retry}
      </Button>
    </div>
  );
}
