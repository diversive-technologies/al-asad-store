import { assertNever } from '@/lib/result';

import type { PageBlock } from '../schemas/page.schema';

export interface StaticPageBlocksProps {
  blocks: readonly PageBlock[];
  /**
   * The level a block's own heading takes. A help page on its own address sits
   * under that page's `h1`, so its blocks head at 2; the same page shown in a
   * dialog sits under the dialog's `h2`, so they head at 3 (A11Y-09).
   */
  headingLevel: 2 | 3;
}

/**
 * The body of one of §21's pages — its typed blocks — wherever that page is shown.
 *
 * Written once for the help page's own address and for the size guide shown beside
 * the size selector, so the two cannot come to render the same content differently
 * (PD-01). The container is the caller's: the spacing a page wants and the spacing
 * a dialog wants are not the same.
 *
 * The body is typed blocks rather than HTML (see `page.schema.ts`), so every block
 * kind has a renderer here and a new kind without one is a compile error (TS-07)
 * rather than a silently missing paragraph.
 */
export function StaticPageBlocks({ blocks, headingLevel }: StaticPageBlocksProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return blocks.map((block) => {
    switch (block.kind) {
      case 'HEADING':
        return (
          <Heading key={block.id} className="text-fg text-xl font-medium">
            {block.text}
          </Heading>
        );
      case 'PARAGRAPH':
        return (
          <p key={block.id} className="text-fg-muted">
            {block.text}
          </p>
        );
      case 'DEFINITION':
        return (
          <div key={block.id} className="border-border border-s-2 ps-4">
            {/* I18N-09: a protected term is rendered exactly as supplied. */}
            <Heading className="text-fg font-medium">{block.term}</Heading>
            <p className="text-fg-muted mt-1">{block.description}</p>
          </div>
        );
      default:
        // TS-07: a new block kind without a renderer is a compile error.
        return assertNever(block);
    }
  });
}
