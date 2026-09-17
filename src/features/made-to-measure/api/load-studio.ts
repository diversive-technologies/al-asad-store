import 'server-only';

import type { Locale } from '@/i18n/locales';
import type { ApiError } from '@/lib/api/errors';
import type { GarmentStyleId } from '@/lib/domain/ids';
import { err, ok, type Result } from '@/lib/result';
import { logApiError, logContentIssue } from '@/lib/utils/log';

import { sanitizeMarks } from '../lib/marks';
import { settleStudioStyle } from '../lib/studio-product';
import { joinCopy, type StudioSet, type StyleChoice } from '../lib/studio-set';
import type { CaptureSource } from '../schemas/measurement-set.schema';
import { fetchMeasurementCopy, fetchMeasurementSet, fetchStyleOffers } from './fetch-studio';
import { tailoredProduct } from './tailored-product';

const CONTEXT = 'made-to-measure';

/** What the address asked for, already parsed; the loader decides what it gets. */
export interface StudioRequest {
  readonly style: GarmentStyleId | null;
  readonly source: CaptureSource | null;
  /** §34 — the product this was opened from, as a slug. */
  readonly product: string | null;
}

export interface StudioData {
  readonly studio: StudioSet;
  readonly choice: StyleChoice;
}

export type StudioUnavailable = 'UNAVAILABLE';

/* ERR-10 — logged once, here, where a failure becomes the page's unavailable
   state. The page itself has nothing left to log. */
function unavailable(problem: ApiError | string): Result<never, StudioUnavailable> {
  if (typeof problem === 'string') logContentIssue(CONTEXT, problem);
  else logApiError(CONTEXT, problem);
  return err('UNAVAILABLE');
}

/**
 * Everything `/stitched` renders, or the one answer that it cannot.
 *
 * The studio's composite read, which is why it sits with the readers: three
 * backend reads, the choice of list, and the judgement of what in them is usable,
 * each step pure and in `lib/`.
 *
 * The list waits for the offers because the offers decide which style a bare or
 * stale address falls back to — the first the workshop offers, never a style
 * named in code (D5) — and the fallback is SAID on the page. A way of measuring
 * the style does not offer is a 404 on its own read, and falls back the same way,
 * to the style's first path. Every read is cached, so a wait is a cache lookup.
 *
 * A PRODUCT in play settles the style itself, ahead of `?style=` and ahead of the
 * fallback: the workshop cuts a given garment as one style, so the two can only
 * ever disagree by somebody editing the address — and a list the product's own
 * profile could never be added against is worse than no product at all. A product
 * whose style the workshop has since stopped offering is therefore dropped rather
 * than opened on the wrong list, and reported.
 *
 * A mark that falls off its drawing, or a style with no name, is dropped and
 * reported, and the page still renders. A garment or point with no wording is not
 * — a field with no name cannot be filled in — so the page shows its error state.
 */
export async function loadStudio(
  requested: StudioRequest,
  locale: Locale,
): Promise<Result<StudioData, StudioUnavailable>> {
  /* PERF-02 — three independent reads, one wait. The product is the catalogue's
     and has nothing to say about which offers exist. */
  const [offers, copy, product] = await Promise.all([
    fetchStyleOffers(),
    fetchMeasurementCopy(locale),
    tailoredProduct(requested.product, locale),
  ]);
  if (!offers.ok) return unavailable(offers.error);
  if (!copy.ok) return unavailable(copy.error);

  const settled = settleStudioStyle(offers.value, requested.style, product);
  if (settled.productDropped && product !== null) {
    logContentIssue(CONTEXT, `${product.slug} is cut as ${product.garmentStyle}, not offered`);
  }
  const { style } = settled;

  /* A path the style does not offer: its first path instead. The page compares
     what was asked with what was served to say so (`SourceChooser`). */
  const asked = await fetchMeasurementSet(style, requested.source);
  const pathMissing = asked.ok && asked.value === null && requested.source !== null;
  const served = pathMissing ? await fetchMeasurementSet(style, null) : asked;
  if (!served.ok) return unavailable(served.error);
  if (served.value === null) return unavailable(`${style} is offered but has no measurement set`);

  const { set, dropped } = sanitizeMarks(served.value);
  if (dropped.length > 0) {
    const detail = dropped.map((mark) => `${mark.pointId} (${mark.reason})`).join(', ');
    logContentIssue(CONTEXT, `marks not drawn: ${detail}`);
  }

  const joined = joinCopy(set, offers.value, copy.value);
  if (!joined.ok) return unavailable(`no ${locale} wording for ${joined.error.join(', ')}`);
  if (joined.value.unlabelledStyles.length > 0) {
    logContentIssue(CONTEXT, `no ${locale} name for ${joined.value.unlabelledStyles.join(', ')}`);
  }

  return ok({
    studio: joined.value.studio,
    choice: {
      options: joined.value.styles,
      fellBack: settled.fellBack,
      requestedSource: requested.source,
      product: settled.product,
    },
  });
}
