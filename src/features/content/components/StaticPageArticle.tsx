import type { ReactNode } from 'react';

import type { StaticPage } from '../schemas/page.schema';
import { StaticPageBlocks } from './StaticPageBlocks';

export interface StaticPageArticleProps {
  page: StaticPage;
  /**
   * What the route adds after the served body, in the same column — the store's
   * contact details on Contact us, which come from configuration, not content.
   */
  children?: ReactNode;
}

/**
 * One of §21's pages — a help page or one of §28.4's static pages — as the
 * Content module serves it, at its own address. The blocks are rendered by
 * `StaticPageBlocks`, which the size guide's dialog on the product page shares.
 */
export function StaticPageArticle({ page, children = null }: StaticPageArticleProps) {
  return (
    <article className="page-shell max-w-3xl py-12">
      <h1 className="text-fg text-3xl font-semibold">{page.title}</h1>
      <p className="text-fg-muted mt-3 text-lg">{page.intro}</p>

      <div className="mt-8 flex flex-col gap-6">
        {/* A11Y-09: the blocks' headings descend in order from the h1 above. */}
        <StaticPageBlocks blocks={page.blocks} headingLevel={2} />
        {children}
      </div>
    </article>
  );
}
