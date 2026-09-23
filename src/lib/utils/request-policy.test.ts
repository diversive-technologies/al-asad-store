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

/**
 * Where a method's body begins, however the file chooses to export it.
 *
 * Two shapes are in the tree. Most routes declare the handler AS the export.
 * The bag and checkout writes are wrapped so they record the mock session
 * (D1 serverless, `lib/mocks/session.ts`), which names the function separately
 * and exports the wrapped value:
 *
 *     async function postHandler(request: Request) { … }
 *     export const POST = withMockSession(postHandler);
 *
 * Finding only the first shape is how this guard quietly stopped covering
 * seven write handlers the moment they were wrapped — which is the exact
 * failure it exists to prevent, so it reads both.
 */
function handlerStart(source: string, method: string): number {
  const declared = source.indexOf(`export async function ${method}(`);
  if (declared !== -1) return declared;

  const wrapped = new RegExp(String.raw`export const ${method} = \w+\((\w+)\)`).exec(source);
  const name = wrapped?.[1];
  if (name === undefined) return -1;

  return source.indexOf(`async function ${name}(`);
}

/** The first boundary after `start` that ends a handler body. */
function handlerEnd(source: string, start: number): number {
  const ends = ['\nexport ', '\nasync function ', '\nfunction ']
    .map((marker) => source.indexOf(marker, start + 1))
    .filter((index) => index !== -1);

  return ends.length === 0 ? source.length : Math.min(...ends);
}

/** Every write handler in the tree, with the source of its body. */
function writeHandlers(): [string, string][] {
  return routeFiles().flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return WRITE_METHODS.flatMap((method): [string, string][] => {
      const start = handlerStart(source, method);
      if (start === -1) return [];
      const body = source.slice(start, handlerEnd(source, start));
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
