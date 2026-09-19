import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * TEST-08 — §30.5 "unique address per page", held at the one place a page can
 * break it: its own metadata. The defect this guards against was a single
 * `canonical: '/'` in the ROOT layout, which every route inherited, so every
 * product, listing and help page named the homepage as its canonical address.
 *
 * A build would show it in the rendered `<link rel="canonical">`; a unit test
 * cannot render a route, so this reads the route files instead.
 */
const APP = fileURLToPath(new URL('../../../app', import.meta.url));

function pagesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return pagesUnder(path);
    return entry.name === 'page.tsx' ? [path] : [];
  });
}

const pages = pagesUnder(APP).map((path) => ({
  route: relative(APP, path).replaceAll('\\', '/'),
  source: readFileSync(path, 'utf8'),
}));

/** A page that asks not to be indexed has no canonical to state. */
const indexable = pages.filter((page) => !/index:\s*false/.test(page.source));

describe('canonical addresses', () => {
  it('are not set by the root layout, where every route would inherit one', () => {
    expect(readFileSync(join(APP, 'layout.tsx'), 'utf8')).not.toMatch(/alternates\s*:/);
  });

  it.each(indexable.map((page) => [page.route, page.source]))(
    '%s states its own',
    (_route, source) => {
      expect(source).toMatch(/alternates:\s*localeAlternates\(/);
    },
  );

  it('are different for every indexable page', () => {
    const canonicals = indexable.map(
      (page) => /localeAlternates\(([^;]*?)\)\s*[,}]/.exec(page.source)?.[1] ?? page.route,
    );

    expect(new Set(canonicals).size).toBe(indexable.length);
  });
});
