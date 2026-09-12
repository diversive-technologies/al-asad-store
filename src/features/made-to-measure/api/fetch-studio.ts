import 'server-only';

import { CATALOGUE_REVALIDATE_SECONDS } from '@/config/constants';
import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import type { GarmentStyleId } from '@/lib/domain/ids';
import { styleOffersSchema, type StyleOffers } from '@/lib/domain/style-offer';
import { ok, type Result } from '@/lib/result';

import { measurementCopySchema, type MeasurementCopy } from '../schemas/measurement-copy.schema';
import {
  measurementSetSchema,
  type CaptureSource,
  type MeasurementSet,
} from '../schemas/measurement-set.schema';

/**
 * DATA-04 — the three reads the studio is built from.
 *
 * DATA-09 — caching intent: all three are CONTENT. They change when the workshop
 * edits its card or a translator edits a word, never per customer, so they cache
 * the way the catalogue does and carry tags an edit can invalidate. Nothing about
 * the customer travels on any of them.
 */
const CACHE_SECONDS = CATALOGUE_REVALIDATE_SECONDS;

/** A2-4 — the styles the workshop stitches, in the order it offers them. */
export function fetchStyleOffers(): Promise<Result<StyleOffers, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.madeToMeasure.styles,
    schema: styleOffersSchema,
    next: { revalidate: CACHE_SECONDS, tags: ['made-to-measure'] },
  });
}

/**
 * A2-3 — one style's measurement list, for one way of measuring it, or — with no
 * source — the style's first. A style or a path the backend does not offer is an
 * ordinary answer (`ok(null)`), not a failure; every other failure stays one.
 */
export function fetchMeasurementSet(
  garmentStyle: GarmentStyleId,
  source: CaptureSource | null,
): Promise<Result<MeasurementSet | null, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.madeToMeasure.set,
    schema: measurementSetSchema,
    searchParams: { style: garmentStyle, source: source ?? undefined },
    next: {
      revalidate: CACHE_SECONDS,
      tags: ['made-to-measure', `made-to-measure:${garmentStyle}`],
    },
  }).then((result) => {
    if (result.ok) return ok(result.value);
    if (result.error.kind === 'NOT_FOUND') return ok(null);
    return result;
  });
}

/** §22 — the studio's words in one language, for every style at once (§34.3). */
export function fetchMeasurementCopy(locale: Locale): Promise<Result<MeasurementCopy, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.localisation.measurementCopy,
    schema: measurementCopySchema,
    searchParams: { locale },
    next: { revalidate: CACHE_SECONDS, tags: ['localisation', `localisation:${locale}`] },
  });
}
