'use client';

import { Button } from '@/components/ui/button';
import { useMessages } from '@/i18n/use-messages';

export interface CheckoutErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** ERR-09 / ERR-11: our copy, never the thrown error's text (SEC-07). */
export default function CheckoutError({ reset }: CheckoutErrorProps) {
  const messages = useMessages();

  return (
    <section className="page-shell max-w-xl py-16">
      <h1 className="text-fg text-xl font-semibold">{messages.checkout.failed}</h1>
      <div className="mt-4">
        <Button type="button" onClick={reset}>
          {messages.common.retry}
        </Button>
      </div>
    </section>
  );
}
