import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * SEC-08 — "Mutating Route Handlers MUST verify origin/CSRF". A Route Handler is
 * not covered by the protection Next.js gives Server Actions, so every write in
 * `app/api` checks `isSameOrigin` itself, before it reads a body or a cookie.
 *
 * Six bag and checkout writes went without it for months while the rule was
 * written down as a known gap. This reads every route file and fails on any
 * write handler that does not open with the check, so the next one cannot.
 *
 * GET handlers are not held to it: they change nothing a forged request could
 * steer, and a cross-site page cannot read what they answer.
 */

const API_ROOT = fileURLToPath(new URL('../../../app/api', import.meta.url));
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

function routeFiles(): string[] {
  return readdirSync(API_ROOT, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith('route.ts'))
    .map((path) => join(API_ROOT, path));
}

/** Every write handler in the tree, with the source of its body. */
function writeHandlers(): [string, string][] {
  return routeFiles().flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return WRITE_METHODS.flatMap((method): [string, string][] => {
      const start = source.indexOf(`export async function ${method}(`);
      if (start === -1) return [];
      const next = source.indexOf('\nexport ', start + 1);
      const body = source.slice(start, next === -1 ? undefined : next);
      return [[`${method} ${relative(API_ROOT, file).replaceAll('\\', '/')}`, body]];
    });
  });
}

describe('SEC-08 across app/api', () => {
  it('finds the write handlers it is guarding', () => {
    expect(writeHandlers().length).toBeGreaterThanOrEqual(15);
  });

  it.each(writeHandlers())('%s refuses another origin first', (_name, body) => {
    const check = body.indexOf('if (!isSameOrigin(request))');
    const firstRead = body.search(/readJsonBody|readFormBody|readCartId|context\.params/);

    expect(check).toBeGreaterThan(-1);
    expect(firstRead === -1 || check < firstRead).toBe(true);
  });
});
