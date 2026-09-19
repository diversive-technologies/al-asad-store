import { useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { useMessages } from '@/i18n/use-messages';

/**
 * A list the address asked for that could not be loaded, said inside the studio
 * rather than instead of it — under the choice of list, where the customer's eye
 * is after pressing it — while the list they were using stays below with every
 * figure in it (`StudioHost`).
 *
 * Asking again is a REFRESH, not a link: the address already names the list that
 * failed, and a refresh re-reads it on the server while the studio stays mounted.
 * Busy rather than disabled while it runs, so the button keeps its focus. Rendered
 * inside `StudioHost`'s client boundary (MOD-06).
 */
export function StudioLoadFailure() {
  const messages = useMessages();
  const router = useRouter();
  const [isRetrying, startRetry] = useTransition();

  return (
    <div className="mm-load-failure mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm">
      <p role="alert" className="text-danger-500">
        {messages.madeToMeasure.listUnloaded}
      </p>
      <button
        type="button"
        className="mm-review-change"
        aria-busy={isRetrying}
        onClick={() => {
          startRetry(() => {
            router.refresh();
          });
        }}
      >
        {messages.common.retry}
      </button>
    </div>
  );
}
