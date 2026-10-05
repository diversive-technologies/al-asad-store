#!/usr/bin/env node
/**
 * F-12 — the post-deploy smoke check.
 *
 *   node scripts/smoke.mjs <base-url> [--wait=<seconds>]
 *   SMOKE_URL=https://shop.example node scripts/smoke.mjs
 *
 * Read-only: it GETs a handful of public pages, writes nothing and places no
 * order. Node built-ins only, so it runs in CI with no install step. It exits 1
 * when any check fails (and prints which), 0 when every check passes.
 *
 * What it asserts, in order:
 *   1. /api/health answers 200 {"status":"UP"} (the storefront reaches Java);
 *      `--wait` keeps retrying this one check, for a deploy that is still
 *      taking over its address;
 *   2. / and /catalogue answer 200, and /catalogue shows at least one <article>;
 *   3. the first product address in /sitemap.xml answers 200 and offers
 *      "Add to bag" or says "Sold out";
 *   4. the security headers of plan F-07 are present on /;
 *   5. /robots.txt answers 200.
 */

import { pathToFileURL } from 'node:url';

const TIMEOUT_MS = 15_000;
const RETRY_EVERY_MS = 5_000;

/** The headers F-07 sets on every path, by name. */
export const REQUIRED_HEADERS = [
  'strict-transport-security',
  'x-content-type-options',
  'referrer-policy',
  'x-frame-options',
  'permissions-policy',
  'content-security-policy',
];

/** One GET, never throwing: a transport failure is a status of 0 and a reason. */
async function get(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: '*/*', 'user-agent': 'al-asad-smoke/1' },
    });
    return { status: response.status, headers: response.headers, body: await response.text() };
  } catch (error) {
    const reason = error instanceof Error ? error.name : 'error';
    return { status: 0, headers: new Headers(), body: '', reason };
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The first `<loc>` of /sitemap.xml that is one product's page, as a path. */
export function firstProductPath(sitemapXml) {
  for (const match of sitemapXml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    try {
      const { pathname } = new URL(match[1].replaceAll('&amp;', '&'));
      if (/^\/catalogue\/[^/]+\/?$/.test(pathname)) return pathname;
    } catch {
      // A malformed <loc> is skipped; the check fails below if none is usable.
    }
  }
  return null;
}

/**
 * Runs every check against `baseUrl`. Resolves to `{ ok, results }`, where each
 * result is `{ name, ok, detail }`. Exported so the test can drive it.
 */
export async function runSmoke(baseUrl, { waitSeconds = 0 } = {}) {
  const base = baseUrl.replace(/\/+$/, '');
  const results = [];
  const record = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    return ok;
  };

  // 1. Health, retried while the deploy settles.
  const deadline = Date.now() + waitSeconds * 1000;
  let health;
  for (;;) {
    health = await get(`${base}/api/health`);
    let up = false;
    try {
      up = health.status === 200 && JSON.parse(health.body).status === 'UP';
    } catch {
      up = false;
    }
    if (up || Date.now() >= deadline) {
      record(
        '/api/health is 200 UP',
        up,
        up ? '' : `status ${health.status}${health.reason ? ` (${health.reason})` : ''}`,
      );
      break;
    }
    await sleep(RETRY_EVERY_MS);
  }

  // 2. The pages a customer lands on.
  const home = await get(`${base}/`);
  record('/ is 200', home.status === 200, `status ${home.status}`);

  const catalogue = await get(`${base}/catalogue`);
  record('/catalogue is 200', catalogue.status === 200, `status ${catalogue.status}`);
  record(
    '/catalogue lists at least one product',
    catalogue.status === 200 && catalogue.body.includes('<article'),
    'no <article> in the page',
  );

  // 3. One product page, found through the sitemap.
  const sitemap = await get(`${base}/sitemap.xml`);
  const productPath = sitemap.status === 200 ? firstProductPath(sitemap.body) : null;
  if (productPath === null) {
    record('sitemap lists a product', false, `status ${sitemap.status}, no product address`);
  } else {
    const product = await get(`${base}${productPath}`);
    record(`${productPath} is 200`, product.status === 200, `status ${product.status}`);
    record(
      `${productPath} offers Add to bag or says Sold out`,
      product.body.includes('Add to bag') || product.body.includes('Sold out'),
      'neither phrase is in the page',
    );
  }

  // 4. Security headers (F-07), read off the home page.
  const missing = REQUIRED_HEADERS.filter((name) => !home.headers.has(name));
  record(
    'security headers present',
    home.status !== 0 && missing.length === 0,
    `missing: ${missing.join(', ')}`,
  );

  // 5. robots.txt.
  const robots = await get(`${base}/robots.txt`);
  record('/robots.txt is 200', robots.status === 200, `status ${robots.status}`);

  return { ok: results.every((result) => result.ok), results };
}

async function main() {
  const args = process.argv.slice(2);
  const wait = args.find((arg) => arg.startsWith('--wait='));
  const url = args.find((arg) => !arg.startsWith('--')) ?? process.env.SMOKE_URL;
  if (url === undefined || url === '') {
    console.error('usage: node scripts/smoke.mjs <base-url> [--wait=<seconds>]');
    process.exitCode = 2;
    return;
  }

  const { ok, results } = await runSmoke(url, {
    waitSeconds: wait === undefined ? 0 : Number(wait.slice('--wait='.length)) || 0,
  });
  for (const result of results) {
    console.log(
      `${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.ok || !result.detail ? '' : `  (${result.detail})`}`,
    );
  }
  console.log(ok ? `\nsmoke check passed against ${url}` : `\nsmoke check FAILED against ${url}`);
  // Not process.exit(): on Windows it can abort while undici sockets are still closing.
  process.exitCode = ok ? 0 : 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
