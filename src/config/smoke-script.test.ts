import { execFile } from 'node:child_process';
import { createServer, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

/**
 * F-12 — `scripts/smoke.mjs` against a stand-in storefront, so the script itself
 * is tested: it passes a healthy site, and fails (exit 1) when the backend is
 * down, a page is missing or a header is absent.
 */

const SCRIPT = path.resolve('scripts/smoke.mjs');

/** The script as a child process. Async on purpose: a blocking spawn would starve the in-process server. */
function cli(args: string[], env: Record<string, string> = {}) {
  return new Promise<{ status: number; stdout: string }>((resolve) => {
    execFile(
      process.execPath,
      [SCRIPT, ...args],
      { encoding: 'utf8', env: { ...process.env, ...env } },
      (error, stdout) => {
        const code = error === null ? 0 : (error as { code?: number | string }).code;
        resolve({ status: typeof code === 'number' ? code : 1, stdout });
      },
    );
  });
}

const HEADERS: Record<string, string> = {
  'strict-transport-security': 'max-age=63072000',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=()',
  'content-security-policy': "default-src 'self'",
};

interface Site {
  health?: number;
  catalogueBody?: string;
  sitemapProduct?: string | null;
  productBody?: string;
  headers?: Record<string, string>;
}

const servers: Server[] = [];

async function serve(site: Site): Promise<string> {
  const headers = site.headers ?? HEADERS;
  const send = (res: ServerResponse, status: number, body: string, type = 'text/html') => {
    res.writeHead(status, { 'content-type': type, ...headers });
    res.end(body);
  };
  const server = createServer((req, res) => {
    const url = req.url ?? '/';
    if (url === '/api/health') {
      const status = site.health ?? 200;
      return send(
        res,
        status,
        JSON.stringify({ status: status === 200 ? 'UP' : 'DOWN' }),
        'application/json',
      );
    }
    if (url === '/') return send(res, 200, '<html>home</html>');
    if (url === '/catalogue')
      return send(res, 200, site.catalogueBody ?? '<main><article>One</article></main>');
    if (url === '/robots.txt') return send(res, 200, 'User-agent: *', 'text/plain');
    if (url === '/sitemap.xml') {
      const product =
        site.sitemapProduct === undefined ? '/catalogue/lawn-suit-1' : site.sitemapProduct;
      const locs = ['/', '/catalogue', ...(product === null ? [] : [product])]
        .map((p) => `<url><loc>https://shop.example${p}</loc></url>`)
        .join('');
      return send(res, 200, `<urlset>${locs}</urlset>`, 'application/xml');
    }
    if (url === '/catalogue/lawn-suit-1')
      return send(res, 200, site.productBody ?? '<button>Add to bag</button>');
    return send(res, 404, 'not found');
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))),
  );
});

async function run(base: string) {
  const smoke = (await import(/* @vite-ignore */ pathToFileURL(SCRIPT).href)) as {
    runSmoke: (url: string) => Promise<{ ok: boolean; results: { name: string; ok: boolean }[] }>;
  };
  return smoke.runSmoke(base);
}

const failedNames = (results: { name: string; ok: boolean }[]) =>
  results.filter((r) => !r.ok).map((r) => r.name);

describe('scripts/smoke.mjs', () => {
  it('passes a healthy storefront', async () => {
    const { ok, results } = await run(await serve({}));
    expect(failedNames(results)).toEqual([]);
    expect(ok).toBe(true);
  });

  it('accepts a sold-out first product', async () => {
    const { ok } = await run(await serve({ productBody: '<p>Sold out</p>' }));
    expect(ok).toBe(true);
  });

  it('fails when the backend is down (health 503)', async () => {
    const { ok, results } = await run(await serve({ health: 503 }));
    expect(ok).toBe(false);
    expect(failedNames(results)).toEqual(['/api/health is 200 UP']);
  });

  it('fails when the catalogue lists no product', async () => {
    const { ok, results } = await run(await serve({ catalogueBody: '<main>None</main>' }));
    expect(ok).toBe(false);
    expect(failedNames(results)).toContain('/catalogue lists at least one product');
  });

  it('fails when the sitemap has no product', async () => {
    const { ok, results } = await run(await serve({ sitemapProduct: null }));
    expect(ok).toBe(false);
    expect(failedNames(results)).toContain('sitemap lists a product');
  });

  it('fails when the product page offers neither Add to bag nor Sold out', async () => {
    const { ok } = await run(await serve({ productBody: '<p>hello</p>' }));
    expect(ok).toBe(false);
  });

  it('fails when a security header is missing', async () => {
    const headers = { ...HEADERS };
    delete headers['content-security-policy'];
    const { ok, results } = await run(await serve({ headers }));
    expect(ok).toBe(false);
    expect(failedNames(results)).toEqual(['security headers present']);
  });

  it('exits 0 when it passes and 1 when it fails, and 1 for an address nobody answers', async () => {
    const good = await cli([await serve({})]);
    expect(good.status).toBe(0);
    expect(good.stdout).toContain('smoke check passed');

    const bad = await cli([await serve({ health: 503 })]);
    expect(bad.status).toBe(1);
    expect(bad.stdout).toContain('FAIL  /api/health is 200 UP');

    const dead = await cli(['http://127.0.0.1:9']);
    expect(dead.status).toBe(1);
  });

  it('exits 2 with no address', async () => {
    expect((await cli([], { SMOKE_URL: '' })).status).toBe(2);
  });
});
