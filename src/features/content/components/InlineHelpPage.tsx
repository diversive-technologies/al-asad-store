import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';
import { logApiError, logContentIssue } from '@/lib/utils/log';

import type { HelpPageRead } from '../api/fetch-help-page';
import { StaticPageBlocks } from './StaticPageBlocks';

export interface InlineHelpPageProps {
  /**
   * §21 `page(slug, locale)` with the slug it asked for, read by the ROUTE beside
   * everything else it reads, so showing a guide never adds a request after the
   * page's own (PERF-02).
   */
  read: HelpPageRead;
  messages: Messages;
}

/**
 * One of §28.4's help pages shown INSIDE another page — the size guide in a dialog
 * beside the size selector, where opening it costs the customer none of the sizes
 * they have already chosen.
 *
 * The same content the page's own address serves, through the same block renderer
 * (PD-01), under a dialog's `h2` rather than a page's `h1`. The dialog is named by
 * its opener, so the page's own title is not repeated inside it.
 *
 * It ends with the page's own address in both cases that have one: a reader may
 * want the guide at full width, and when the read FAILED that address is the way to
 * try again. A page the Content module says does not exist has no address worth
 * offering, so that case says only that the guide is unavailable.
 *
 * ERR-10: the `Result` stops here, so this is the boundary that logs it. §30.2: a
 * guide that cannot be read costs the dialog its contents, never the product page.
 */
export function InlineHelpPage({ read, messages }: InlineHelpPageProps) {
  const { slug, result } = read;
  const t = messages.help;

  if (!result.ok) logApiError(`help:${slug}`, result.error);
  else if (result.value === null) logContentIssue('help', `no page is served for "${slug}"`);

  const page = result.ok ? result.value : null;
  const hasAddress = !result.ok || result.value !== null;

  return (
    <div className="flex flex-col gap-4">
      {page === null ? (
        <p className="text-fg-muted">{t.unavailable}</p>
      ) : (
        <>
          <p className="text-fg-muted">{page.intro}</p>
          <StaticPageBlocks blocks={page.blocks} headingLevel={3} />
        </>
      )}

      {hasAddress ? (
        <Link
          href={ROUTES.help.page(slug)}
          className="text-fg inline-flex min-h-8 items-center self-start text-sm font-medium underline decoration-1 underline-offset-4"
        >
          {t.openFullPage}
        </Link>
      ) : null}
    </div>
  );
}
