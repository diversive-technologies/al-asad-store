import { breadcrumbListData } from '@/lib/utils/structured-data';

import { BreadcrumbTrail, type BreadcrumbTrailProps } from './BreadcrumbTrail';
import { JsonLd } from './JsonLd';

export type { BreadcrumbStep } from './BreadcrumbTrail';

export interface BreadcrumbsProps extends BreadcrumbTrailProps {
  /**
   * The page's canonical address, on an INDEXABLE page (§30.5). Given, the same
   * steps are also published as `BreadcrumbList` structured data, so the trail a
   * reader sees and the one a search engine reads are one list and cannot drift.
   * Omitted on pages that ask not to be indexed, which have nothing to publish.
   */
  canonicalPath?: string;
}

/**
 * Section 30.5's breadcrumbs, written once (PD-01): the visible trail, plus its
 * structured data where the page is indexable.
 *
 * They were hand-written on six pages, and the tap-target repair reached only
 * some of them: the catalogue, search and saved-items trails kept 17px links a
 * finger could not reliably hit. Here the rule exists in one place.
 *
 * For a SERVER Component. The structured data reaches the environment, and with
 * it Zod, so a Client Component draws `BreadcrumbTrail` instead (PERF-10).
 */
export function Breadcrumbs({ canonicalPath, ...trail }: BreadcrumbsProps) {
  return (
    <>
      {canonicalPath === undefined ? null : (
        <JsonLd data={breadcrumbListData(trail.steps, canonicalPath)} />
      )}
      <BreadcrumbTrail {...trail} />
    </>
  );
}
