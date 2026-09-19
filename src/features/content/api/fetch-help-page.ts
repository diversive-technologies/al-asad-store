import type { Locale } from '@/i18n/locales';
import type { ApiError } from '@/lib/api/errors';
import type { Result } from '@/lib/result';

import type { StaticPage } from '../schemas/page.schema';
import { fetchPage } from './fetch-page';

/**
 * One help page's read, kept together with the slug it was asked for.
 *
 * `InlineHelpPage` needs both — the content, and the page's own address to offer
 * even when the content could not be read — and taking them as one value means it
 * can never be handed one page's content with another page's address.
 */
export interface HelpPageRead {
  readonly slug: string;
  readonly result: Result<StaticPage | null, ApiError>;
}

/** DATA-04 — §21 `page(slug, locale)` for showing inside another page; see `fetchPage`. */
export async function fetchHelpPage(slug: string, locale: Locale): Promise<HelpPageRead> {
  return { slug, result: await fetchPage(slug, locale) };
}
