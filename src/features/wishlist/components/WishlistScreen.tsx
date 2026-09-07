'use client';

import { useQuery } from '@tanstack/react-query';

import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { ProductGrid } from '@/features/catalogue/contract';
import { useSession } from '@/features/auth';
import { useWishlist } from '@/hooks/use-wishlist';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';
import { formatPlural } from '@/lib/utils/format';

import { fetchSavedProducts } from '../api/fetch-saved-products';

export interface WishlistScreenProps {
  locale: Locale;
  messages: Messages;
}

/**
 * §28.3's saved items.
 *
 * A CLIENT screen, unavoidably: the list lives in this browser's own storage
 * (see `useWishlist`), so the server cannot know what to render. That is the
 * interim D3 leaves behind — a real wishlist belongs to an account, and when
 * M6 lands this page reads the same shape from the server instead and the grid
 * below does not change.
 *
 * It is offered only to a SIGNED-IN customer, because the heart is. Showing a
 * guest an empty saved list they were never allowed to fill would be a page
 * apologising for a control it also hides.
 */
export function WishlistScreen({ locale, messages }: WishlistScreenProps) {
  const t = messages.wishlist;
  const { isSignedIn } = useSession();
  const { ids, isReady } = useWishlist();

  const saved = useQuery({
    queryKey: queryKeys.wishlist.products(ids, locale),
    queryFn: ({ signal }) => unwrap(fetchSavedProducts(ids, locale, signal)),
    /*
     * Not until the ids have been read. `ids` is empty on the first render by
     * design — it is read in an effect so the server and client renders agree —
     * so firing now would ask for nothing and cache the answer.
     */
    enabled: isReady && isSignedIn && ids.length > 0,
    staleTime: 30 * 1000,
    retry: false,
  });

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-start gap-3 py-16">
        <h2 className="text-fg text-lg font-medium">{t.signedOutHeading}</h2>
        <p className="text-fg-muted">{t.signedOutBody}</p>
        <ButtonLink href={ROUTES.signIn} variant="primary">
          {messages.auth.signInCta}
        </ButtonLink>
      </div>
    );
  }

  // `isReady` distinguishes an empty list from one that has not been read yet;
  // without it the page would flash "nothing saved" on every load.
  if (!isReady || (ids.length > 0 && saved.isPending)) {
    return <p className="text-fg-muted py-16 text-sm">{messages.common.loading}</p>;
  }

  if (saved.isError) {
    return <p className="text-fg-muted py-16 text-sm">{t.unreachable}</p>;
  }

  const entries = saved.data ?? [];

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 py-16">
        <h2 className="text-fg text-lg font-medium">{t.emptyHeading}</h2>
        <p className="text-fg-muted">{t.emptyBody}</p>
        <ButtonLink href={ROUTES.catalogue.list} variant="secondary">
          {messages.catalogue.browseAll}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* I18N-07: the count goes through the locale's plural rules. */}
      <p className="text-fg-muted text-sm">
        <bdi>{formatPlural(t.savedCount, entries.length, locale)}</bdi>
      </p>

      {/*
       * Fewer products came back than were asked for, which means one has been
       * withdrawn from sale since it was saved. Said plainly rather than left
       * as a list that quietly shrank — the customer chose those items and is
       * owed an explanation for a missing one.
       */}
      {entries.length < ids.length ? (
        <p className="text-fg-muted text-sm">
          <bdi>{formatPlural(t.withdrawn, ids.length - entries.length, locale)}</bdi>
        </p>
      ) : null}

      {/*
       * The SAME grid and the same card as the catalogue, so the heart, the
       * quick add and the frame carousel all work here for free (PD-01) —
       * including un-hearting, which removes the item from this very page.
       */}
      <ProductGrid entries={entries} locale={locale} messages={messages} />
    </div>
  );
}
