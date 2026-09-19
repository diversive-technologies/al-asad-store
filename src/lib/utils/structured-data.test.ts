import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/config/routes';
import { absoluteUrl } from '@/config/site';

import { breadcrumbListData, schemaOrgPrice, storeStructuredData } from './structured-data';

/** §30.5 — breadcrumb and store structured data, and the machine price format. */

describe('breadcrumbListData', () => {
  const steps = [
    { label: 'Home', href: ROUTES.home },
    { label: 'Catalogue', href: ROUTES.catalogue.list },
    { label: 'Any product' },
  ];
  const current = ROUTES.catalogue.detail('any-product');

  it('lists the visible trail in order, numbered from one', () => {
    expect(breadcrumbListData(steps, current)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl(ROUTES.home) },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Catalogue',
          item: absoluteUrl(ROUTES.catalogue.list),
        },
        { '@type': 'ListItem', position: 3, name: 'Any product', item: absoluteUrl(current) },
      ],
    });
  });

  it('names the unlinked current page by its own canonical address', () => {
    expect(breadcrumbListData([{ label: 'Catalogue' }], ROUTES.catalogue.list)).toHaveProperty(
      'itemListElement.0.item',
      absoluteUrl(ROUTES.catalogue.list),
    );
  });

  it('writes every address in full, because a search engine does not resolve it', () => {
    expect(breadcrumbListData(steps, current)).toHaveProperty(
      'itemListElement',
      steps.map(() => expect.objectContaining({ item: expect.stringMatching(/^https?:\/\//) })),
    );
  });
});

describe('storeStructuredData', () => {
  it('describes the store and its website by name and address, joined by id', () => {
    const home = absoluteUrl(ROUTES.home);

    expect(storeStructuredData('Al-Asad')).toEqual({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Organization', '@id': `${home}#organization`, name: 'Al-Asad', url: home },
        {
          '@type': 'WebSite',
          '@id': `${home}#website`,
          name: 'Al-Asad',
          url: home,
          publisher: { '@id': `${home}#organization` },
        },
      ],
    });
  });

  it('publishes none of the placeholder contact details', () => {
    const body = JSON.stringify(storeStructuredData('Al-Asad'));

    expect(body).not.toMatch(/telephone|email|address|contactPoint|logo/);
  });
});

describe('schemaOrgPrice', () => {
  it.each([
    [349_950, '3499.50'],
    [450_000, '4500.00'],
    [1_234_567, '12345.67'],
    [5, '0.05'],
    [0, '0.00'],
  ])('writes %i paisa as %s rupees, with a point and no grouping', (minor, expected) => {
    expect(schemaOrgPrice(minor)).toBe(expected);
  });
});
