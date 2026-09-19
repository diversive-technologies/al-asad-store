import Link from 'next/link';

import { ButtonLink } from '@/components/ui/button';
import type { Messages } from '@/i18n/messages/en';

import { latestOrdersHref, type OrderHistoryLink } from '../lib/order-history';

export interface AccountOrdersPagingProps {
  /** Where "Show more" goes, or `null` when the oldest order is already shown. */
  next: OrderHistoryLink | null;
  /** The shown window starts further back than the newest order. */
  isPastNewest: boolean;
  messages: Messages;
}

/**
 * §28.3's order history past its first page, as LINKS, so it works before any
 * JavaScript has loaded and every view has an address that can be returned to.
 * Which link, and where it lands, is `order-history.ts`'s pure rule (MOD-04).
 */
export function AccountOrdersPaging({ next, isPastNewest, messages }: AccountOrdersPagingProps) {
  const t = messages.account;
  if (next === null && !isPastNewest) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-4">
      {next === null ? null : (
        <ButtonLink href={next.href} variant="secondary">
          {next.kind === 'MORE' ? t.ordersShowMore : t.ordersShowOlder}
        </ButtonLink>
      )}
      {isPastNewest ? (
        <Link
          href={latestOrdersHref()}
          className="text-fg rounded-card focus-visible:ring-brand-500 text-sm underline focus-visible:ring-2 focus-visible:outline-none"
        >
          {t.ordersBackToLatest}
        </Link>
      ) : null}
    </div>
  );
}
