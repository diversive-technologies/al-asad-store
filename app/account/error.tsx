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
 * Measurements that cannot be READ are not this: the section says so itself and
 * the rest of the page still renders. This catches what nothing anticipated.
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
