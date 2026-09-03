import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import type { Result } from '@/lib/result';

import { homepageSchema, type Homepage } from '../schemas/homepage.schema';

/**
 * DATA-04 — a thin, typed wrapper over the client.
 *
 * The locale travels as a query parameter, NOT as `Accept-Language`. That is
 * deliberate and was found by testing: Next's data cache keys on the request
 * URL, so a header-scoped variant makes both locales collide on one cache
 * entry and the store renders English content inside the Urdu page. Putting the
 * locale in the URL makes the two responses distinct to every cache between
 * here and the backend.
 *
 * The tag is per-locale for the same reason — Content can invalidate the Urdu
 * homepage without discarding the English one.
 */
export function fetchHomepage(locale: Locale): Promise<Result<Homepage, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.content.homepage,
    schema: homepageSchema,
    searchParams: { locale },
    // DATA-09: editorial content is cached and revalidated on write to Content.
    next: { revalidate: 300, tags: ['content:homepage', `content:homepage:${locale}`] },
  });
}
