import { afterEach, describe, expect, it, vi } from 'vitest';

async function loader(host: string | undefined) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_MEDIA_HOST', host ?? '');
  return (await import('./image-loader')).default;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

const address = 'https://media.example.com/products/p/front-1600-0a1b2c3d.avif';

describe('mediaImageLoader', () => {
  it('serves the 480, 960 or 1600 file for the requested width', async () => {
    const load = await loader('media.example.com');
    expect(load({ src: address, width: 384 })).toContain('/front-480-');
    expect(load({ src: address, width: 750 })).toContain('/front-960-');
    expect(load({ src: address, width: 1200 })).toContain('/front-1600-');
  });

  it('leaves a fixture image and a non-matching media file alone', async () => {
    const load = await loader('media.example.com');
    expect(load({ src: '/products/x.avif', width: 640 })).toBe('/products/x.avif');
    const poster = 'https://media.example.com/hero/film-0a1b2c3d.jpg';
    expect(load({ src: poster, width: 640 })).toBe(poster);
  });

  it('changes nothing when no media host is configured', async () => {
    const load = await loader(undefined);
    expect(load({ src: address, width: 384 })).toBe(address);
  });
});
