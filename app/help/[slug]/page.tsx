import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ErrorState } from '@/components/shared/ErrorState';
import { fetchPage } from '@/features/content';
import { getLocale, getMessages } from '@/i18n';
import { assertNever } from '@/lib/result';
import { logApiError } from '@/lib/utils/log';

export interface HelpPageProps {
  // NEXT-03: params is a Promise in Next.js 16.
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: HelpPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const page = await fetchPage(slug, locale);

  // NEXT-11 / section 30.5: a unique title per page, from the content itself.
  if (!page.ok || page.value === null) return {};
  return { title: page.value.title, description: page.value.intro };
}

/**
 * The four help pages of section 28.4, served by section 21's Content module.
 *
 * One route for all of them: they differ only in content, so a route each would
 * be four copies of the same composition (PD-01).
 */
export default async function HelpPage({ params }: HelpPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const [messages, result] = await Promise.all([getMessages(), fetchPage(slug, locale)]);

  if (!result.ok) {
    logApiError('help', result.error); // ERR-10
    return <ErrorState className="m-gutter" message={messages.errors.network} />;
  }

  // ERR-06: notFound() is a framework control-flow signal, not error handling.
  if (result.value === null) notFound();

  const page = result.value;

  return (
    <article className="page-shell max-w-3xl py-12">
      <h1 className="text-fg text-3xl font-semibold">{page.title}</h1>
      <p className="text-fg-muted mt-3 text-lg">{page.intro}</p>

      <div className="mt-8 flex flex-col gap-6">
        {page.blocks.map((block) => {
          switch (block.kind) {
            case 'HEADING':
              return (
                // A11Y-09: headings descend in order from the h1 above.
                <h2 key={block.id} className="text-fg text-xl font-medium">
                  {block.text}
                </h2>
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
                  <h2 className="text-fg font-medium">{block.term}</h2>
                  <p className="text-fg-muted mt-1">{block.description}</p>
                </div>
              );
            default:
              // TS-07: a new block kind without a renderer is a compile error.
              return assertNever(block);
          }
        })}
      </div>
    </article>
  );
}
