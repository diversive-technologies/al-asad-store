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
 * This segment had no boundary at all, so an unexpected throw here escaped to
 * the root one and lost the customer their order number along with the page.
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
