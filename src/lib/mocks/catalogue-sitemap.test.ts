import { describe, expect, it } from 'vitest';

import { CATALOGUE } from './catalogue-db';
import { sitemapProductsAt } from './catalogue-sitemap';

/**
 * §30.5 "automatic sitemap excluding unlaunched products" — the rule the mock
 * owns on the backend's behalf. Launch dates are read off the fixture, never
 * written here, so the test holds whatever the catalogue becomes.
 */

const launchTimes = CATALOGUE.map((record) => Date.parse(record.launchedAt)).sort((a, b) => a - b);
/** A moment by which some of the catalogue had launched and some had not. */
const MIDWAY = launchTimes[Math.floor(launchTimes.length / 2)] ?? 0;

const slugsAt = (now: number): string[] => sitemapProductsAt(now).products.map((p) => p.slug);

describe('the sitemap feed', () => {
  it('lists every product once its launch has come', () => {
    expect(slugsAt(Date.now()).sort()).toEqual(CATALOGUE.map((record) => record.slug).sort());
  });

  it('leaves out a product whose launch is still to come', () => {
    const unlaunched = CATALOGUE.filter((record) => Date.parse(record.launchedAt) > MIDWAY);
    const launched = CATALOGUE.filter((record) => Date.parse(record.launchedAt) <= MIDWAY);

    expect(unlaunched.length).toBeGreaterThan(0);
    expect(slugsAt(MIDWAY)).toEqual(expect.not.arrayContaining(unlaunched.map((r) => r.slug)));
    expect(slugsAt(MIDWAY).sort()).toEqual(launched.map((record) => record.slug).sort());
  });

  it('dates each product by its launch, the last time the fixture changed it', () => {
    const [first] = sitemapProductsAt(Date.now()).products;
    const record = CATALOGUE.find((candidate) => candidate.slug === first?.slug);

    expect(first?.lastModifiedAt).toBe(record?.launchedAt);
  });
});
