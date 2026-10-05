import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * R-04 — where the garment's photograph comes from. The module is loaded per
 * test, because the media host is read from the client environment at import.
 */

const HOST = 'media.example.com';
const ADDRESS = `https://${HOST}/products/lawn-01/front-1600-0a1b2c3d.avif`;

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => {
  server.close();
});

async function load(mediaHost: string | undefined) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_MEDIA_HOST', mediaHost ?? '');
  return import('./try-on-images');
}

async function png(): Promise<Buffer> {
  return sharp({
    create: { width: 40, height: 50, channels: 3, background: { r: 10, g: 120, b: 90 } },
  })
    .png()
    .toBuffer();
}

describe('garmentImage on the media host', () => {
  it('fetches the address and converts it to a JPEG for the provider', async () => {
    const body = await png();
    server.use(
      http.get(ADDRESS, () =>
        HttpResponse.arrayBuffer(new Uint8Array(body).buffer, {
          headers: { 'content-type': 'image/png' },
        }),
      ),
    );
    const { garmentImage } = await load(HOST);

    const result = await garmentImage(ADDRESS);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mimeType).toBe('image/jpeg');
      expect((await sharp(result.value.bytes).metadata()).format).toBe('jpeg');
    }
  });

  it('refuses another host without making a request', async () => {
    const { garmentImage } = await load(HOST);

    const result = await garmentImage('https://elsewhere.example.com/a.avif');

    expect(result).toMatchObject({ ok: false, error: { reason: 'PROVIDER_FAILED' } });
  });

  it('refuses every absolute address when no media host is configured', async () => {
    const { garmentImage } = await load(undefined);

    expect(await garmentImage(ADDRESS)).toMatchObject({ ok: false });
  });

  it('refuses a plain-http address on the media host', async () => {
    const { garmentImage } = await load(HOST);

    expect(await garmentImage(ADDRESS.replace('https:', 'http:'))).toMatchObject({ ok: false });
  });

  it('refuses a body that is not an image', async () => {
    server.use(http.get(ADDRESS, () => HttpResponse.text('<html></html>')));
    const { garmentImage } = await load(HOST);

    expect(await garmentImage(ADDRESS)).toMatchObject({
      ok: false,
      error: { reason: 'PROVIDER_FAILED' },
    });
  });

  it('refuses an answer that is not a success', async () => {
    server.use(http.get(ADDRESS, () => new HttpResponse(null, { status: 404 })));
    const { garmentImage } = await load(HOST);

    expect(await garmentImage(ADDRESS)).toMatchObject({
      ok: false,
      error: { detail: expect.stringContaining('404') },
    });
  });

  it('refuses a body over 3 MB, whether or not it declares its length', async () => {
    const big = new Uint8Array(3_000_001);
    server.use(
      http.get(ADDRESS, () =>
        HttpResponse.arrayBuffer(big.buffer, { headers: { 'content-type': 'image/png' } }),
      ),
    );
    const { garmentImage } = await load(HOST);

    expect(await garmentImage(ADDRESS)).toMatchObject({
      ok: false,
      error: { detail: expect.stringContaining('larger than') },
    });
  });

  it('answers TIMEOUT when the CDN does not answer in time', async () => {
    const { delay } = await import('msw');
    server.use(
      http.get(ADDRESS, async () => {
        await delay('infinite');
        return HttpResponse.text('never');
      }),
    );
    const { garmentImage } = await load(HOST);

    expect(await garmentImage(ADDRESS, 50)).toMatchObject({
      ok: false,
      error: { reason: 'TIMEOUT' },
    });
  });

  it('puts neither a query string nor credentials in the fault detail', async () => {
    server.use(http.get(`https://${HOST}/x.avif`, () => new HttpResponse(null, { status: 500 })));
    const { garmentImage } = await load(HOST);

    const result = await garmentImage(`https://user:secret@${HOST}/x.avif?token=abc`);

    expect(JSON.stringify(result)).not.toMatch(/secret|token=abc/);
  });
});

describe('garmentImage from public/', () => {
  it('still reads a fixture path from disk', async () => {
    const { garmentImage } = await load(HOST);
    const { readdir } = await import('node:fs/promises');
    const files = (await readdir('public/products')).filter((name) => name.endsWith('.avif'));

    const result = await garmentImage(`/products/${files[0]}`);

    expect(result.ok).toBe(true);
  });

  it('refuses a path that escapes public/', async () => {
    const { garmentImage } = await load(HOST);

    expect(await garmentImage('/../package.json')).toMatchObject({ ok: false });
  });
});
