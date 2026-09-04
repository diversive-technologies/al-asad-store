import { CATALOGUE_REVALIDATE_SECONDS } from '@/config/constants';
import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { ok, type Result } from '@/lib/result';

import { staticPageSchema, type StaticPage } from '../schemas/page.schema';

/**
 * DATA-04 — section 21 `page(slug, locale)`.
 *
 * A missing page is an ordinary outcome that the route turns into `notFound()`,
 * so NOT_FOUND is translated into `ok(null)` here and every other error stays an
 * error. A timeout must not render "no such page".
 */
export function fetchPage(
  slug: string,
  locale: Locale,
): Promise<Result<StaticPage | null, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.content.page,
    schema: staticPageSchema,
    searchParams: { slug, locale },
    next: { revalidate: CATALOGUE_REVALIDATE_SECONDS, tags: ['content', `content:${locale}`] },
  }).then((result) => {
    if (result.ok) return ok(result.value);
    if (result.error.kind === 'NOT_FOUND') return ok(null);
    return result;
  });
}
