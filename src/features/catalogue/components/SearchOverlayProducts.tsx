'use client';

import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';

import type { SearchPanel } from '../hooks/use-search-panel';
import { setCollection } from '../lib/query-changes';
import { EMPTY_QUERY, toQueryString } from '../lib/search-params';
import { productsShownStatus } from '../lib/suggestions';
import { ProductCard } from './ProductCard';

export interface SearchOverlayProductsProps {
  panel: SearchPanel;
  locale: Locale;
  messages: Messages;
}

/**
 * The search panel's products: best sellers before a keystroke, matches after.
 *
 * The cards are `ProductCard`, not a reduced copy, so the frames, the heart and
 * the quick add all work in here for free (PD-01).
 *
 * "View all" is where the panel's question becomes a page address. Before a
 * keystroke that address is the COLLECTION the backend drew the best sellers
 * from, so the listing opened holds the products that were just shown — the
 * plain listing is ordered by newest and shows something else. After one, it is
 * the search, filters included. Both leave through the panel, which closes it.
 *
 * A11Y-05: the count is announced, because the list changes as you type — once
 * an answer is in, never while one is on its way (`productsShownStatus`).
 */
export function SearchOverlayProducts({ panel, locale, messages }: SearchOverlayProductsProps) {
  const t = messages.search;
  const isDefault = panel.settledTerm.length === 0;
  const products = panel.suggestions?.products ?? [];
  const collection = panel.suggestions?.collection ?? null;

  return (
    <section aria-labelledby="search-products-heading">
      <div className="search-overlay-heading">
        <h2 id="search-products-heading">{isDefault ? t.bestSellersHeading : t.productsHeading}</h2>

        {!isDefault || collection === null ? null : (
          <Link
            href={`${ROUTES.catalogue.list}${toQueryString(setCollection(EMPTY_QUERY, collection))}`}
            onClick={panel.dismiss}
            className="text-fg text-xs underline"
          >
            {t.viewAll}
          </Link>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {productsShownStatus(panel.suggestions, t.resultCount, locale)}
      </p>

      {products.length === 0 ? (
        <p className="text-fg-muted py-8 text-sm">
          {panel.isPending ? messages.common.loading : t.noResultsHeading}
        </p>
      ) : (
        <div className="search-overlay-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              entry={{ product, availability: null }}
              locale={locale}
              messages={messages}
              sizes="(min-width: 64rem) 16rem, 45vw"
            />
          ))}
        </div>
      )}

      {isDefault || products.length === 0 ? null : (
        <div className="search-overlay-footer">
          <button type="button" onClick={panel.viewMatches} className="text-fg text-sm underline">
            {formatTemplate(t.viewAllTerm, { term: panel.settledTerm })}
          </button>
        </div>
      )}
    </section>
  );
}
