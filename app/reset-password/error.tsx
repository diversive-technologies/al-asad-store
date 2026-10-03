'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/i18n/use-messages';

export interface ResetPasswordErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * ERR-09 — a Client Component boundary receiving `{ error, reset }`.
 * SEC-07 / ERR-11 — the caught error is never rendered; copy comes from SSOT-07.
 */
export default function ResetPasswordError({ reset }: ResetPasswordErrorProps) {
  const t = useMessages();

  return (
    <div className="page-shell max-w-sm py-12">
      <ErrorState message={t.errors.unexpected} className="mb-4" />
      <Button variant="secondary" onClick={reset}>
        {t.common.retry}
      </Button>
    </div>
  );
}
