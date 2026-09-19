import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * PERF-10 — the studio's first load carries no Zod. Its form validation is
 * fetched when a field is first used (`measurement-validation.ts`), which is only
 * worth anything while nothing else in the studio imports Zod statically. One
 * import did: the breadcrumb trail reached the structured data, the structured
 * data the app URL, and `env.client.ts` validates that URL with Zod — 84 kB
 * gzipped on `/stitched`, taking the route from 196.5 kB to 280 kB against a
 * 200 kB budget. Nothing in the unit suite or the build said so.
 *
 * `MeasurementStudio` is the studio's client boundary, so everything it reaches
 * through a static VALUE import is in the route's first load. This walks that
 * graph the way the bundler does: `import type` and type-only specifiers are
 * erased, and a deliberate `import()` split (IMP-01a) is not followed.
 */

const STUDIO = 'src/features/made-to-measure/components/MeasurementStudio.tsx';

/** Downloaded on demand, never with the page. */
const ON_DEMAND = ['zod', '@hookform/resolvers/zod'] as const;

const STATEMENT =
  /^\s*(?:import|export)\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm;

const CANDIDATES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

function isTypeOnly(clause: string): boolean {
  const named = /^\{([\s\S]*)\}$/.exec(clause.trim());
  if (named?.[1] === undefined) return false;
  const specifiers = named[1]
    .split(',')
    .map((specifier) => specifier.trim())
    .filter((specifier) => specifier !== '');
  return specifiers.length > 0 && specifiers.every((specifier) => specifier.startsWith('type '));
}

function valueImports(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(STATEMENT)].flatMap((match) => {
    const [, typeKeyword, clause = '', from, bare] = match;
    if (bare !== undefined) return [bare];
    if (typeKeyword !== undefined || from === undefined || isTypeOnly(clause)) return [];
    return [from];
  });
}

/** A project file's path, or the specifier itself for a package. */
function resolveImport(importer: string, specifier: string): string {
  let base: string;
  if (specifier.startsWith('@/')) base = join('src', specifier.slice(2));
  else if (specifier.startsWith('.')) base = relative('.', resolve(dirname(importer), specifier));
  else return specifier;
  const found = CANDIDATES.map((suffix) => base + suffix).find(
    (path) => existsSync(path) && statSync(path).isFile(),
  );
  if (found === undefined)
    throw new Error(`${importer} imports ${specifier}, which does not resolve`);
  return found;
}

/** Every module reachable from `entry`, each mapped to the module that first imported it. */
function staticGraph(entry: string): Map<string, string | null> {
  const reached = new Map<string, string | null>([[entry, null]]);
  const queue = [entry];
  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    for (const specifier of valueImports(file)) {
      const target = resolveImport(file, specifier);
      if (reached.has(target)) continue;
      reached.set(target, file);
      if (target !== specifier) queue.push(target);
    }
  }
  return reached;
}

/** The import chain from the entry to `target`, or null when it is not reached. */
function chainTo(graph: Map<string, string | null>, target: string): string[] | null {
  if (!graph.has(target)) return null;
  const chain: string[] = [];
  for (let node: string | null | undefined = target; node != null; node = graph.get(node)) {
    chain.unshift(node);
  }
  return chain;
}

describe("the studio's first load", () => {
  const graph = staticGraph(join(STUDIO));

  it("follows the studio's own imports into its packages", () => {
    expect(graph.size).toBeGreaterThan(40);
    expect(chainTo(graph, 'react-hook-form')).not.toBeNull();
  });

  it.each(ON_DEMAND)('does not reach %s through a static import', (pkg) => {
    expect(chainTo(graph, pkg)).toBeNull();
  });
});
