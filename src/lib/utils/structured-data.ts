import { CLIENT } from '@/config/client';
import { ROUTES } from '@/config/routes';
import { absoluteUrl } from '@/config/site';

import type { JsonLdDocument } from './json-ld';

/**
 * §30.5 — the structured data that is not any one feature's: breadcrumbs, and the
 * store itself. Pure builders; `JsonLd` writes what they return into the page.
 *
 * Every address is ABSOLUTE, resolved against the same base as the canonical
 * addresses (`absoluteUrl`), because a search engine reads a JSON-LD `item` or
 * `url` as it stands and does not resolve it against the page.
 *
 * Nothing here is invented: no rating, no review count, no logo the client has
 * not supplied (§28.6 defers reviews, and the shipped icon is a placeholder). A
 * field is added when the store actually has the fact behind it.
 */

export const SCHEMA_ORG_CONTEXT = 'https://schema.org';

/** One step of a breadcrumb trail, as `Breadcrumbs` draws it: the last has no link. */
export interface BreadcrumbTrailStep {
  readonly label: string;
  readonly href?: string;
}

/**
 * A `BreadcrumbList` from the SAME steps the visible trail draws, so what a reader
 * sees and what a search engine reads cannot disagree. The current page carries no
 * link in the trail; here it is named by `currentPath`, its canonical address.
 */
export function breadcrumbListData(
  steps: readonly BreadcrumbTrailStep[],
  currentPath: string,
): JsonLdDocument {
  return {
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.label,
      item: absoluteUrl(step.href ?? currentPath),
    })),
  };
}

/**
 * The store, for the homepage: an `Organization` and the `WebSite` it publishes,
 * joined by id. Name and address only — the two facts the store has for certain.
 * Contact details are deliberately absent: they are FIXTURE placeholders in
 * `client.ts` until the client supplies them, and a placeholder published as
 * structured data is a placeholder a search engine shows as fact.
 */
export function storeStructuredData(storeName: string): JsonLdDocument {
  const url = absoluteUrl(ROUTES.home);
  const organisationId = `${url}#organization`;

  return {
    '@context': SCHEMA_ORG_CONTEXT,
    '@graph': [
      { '@type': 'Organization', '@id': organisationId, name: storeName, url },
      {
        '@type': 'WebSite',
        '@id': `${url}#website`,
        name: storeName,
        url,
        publisher: { '@id': organisationId },
      },
    ],
  };
}

/**
 * A price in minor units as schema.org's `price` wants it: a plain decimal in the
 * currency's major unit, with a `.` and no symbol or grouping — `349950` paisa is
 * `"3499.50"`. Machine-readable, so deliberately NOT the locale formatter
 * (I18N-08 governs text a person reads). Integer arithmetic throughout (DATA-11):
 * the division never meets a float.
 *
 * The number of decimals follows the client's currency (`minorUnitsPerMajor`, a
 * power of ten), so a currency with no minor unit prints a whole number.
 */
export function schemaOrgPrice(amountMinor: number): string {
  const perMajor = CLIENT.market.currency.minorUnitsPerMajor;
  const decimals = String(perMajor).length - 1;
  const major = String(Math.trunc(amountMinor / perMajor));

  if (decimals === 0) return major;
  return `${major}.${String(amountMinor % perMajor).padStart(decimals, '0')}`;
}
