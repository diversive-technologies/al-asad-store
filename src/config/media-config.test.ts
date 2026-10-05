import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadConfig(mediaHost: string | undefined) {
  vi.resetModules();
  if (mediaHost === undefined) vi.stubEnv('NEXT_PUBLIC_MEDIA_HOST', '');
  else vi.stubEnv('NEXT_PUBLIC_MEDIA_HOST', mediaHost);
  const { default: nextConfig } = await import('../../next.config');
  const entries = (await nextConfig.headers?.()) ?? [];
  const csp = entries
    .find((entry) => entry.source === '/:path*')
    ?.headers.find((header) => header.key === 'Content-Security-Policy')?.value;
  return { nextConfig, csp: csp ?? '' };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('R-03 media configuration', () => {
  it('uses the custom loader file for every next/image', async () => {
    const { nextConfig } = await loadConfig(undefined);
    expect(nextConfig.images?.loader).toBe('custom');
    expect(nextConfig.images?.loaderFile).toBe('./src/lib/media/image-loader.ts');
    expect(nextConfig.images?.deviceSizes).toEqual([480, 960, 1600]);
  });

  it('adds no media origin and no remote pattern when the host is unset', async () => {
    const { nextConfig, csp } = await loadConfig(undefined);
    expect(csp).toContain("img-src 'self' data: blob:;");
    expect(csp).toContain("media-src 'self';");
    expect(nextConfig.images?.remotePatterns).toEqual([]);
  });

  it('allows the media host, and only it, in img-src, media-src and remotePatterns', async () => {
    const { nextConfig, csp } = await loadConfig('media.example.com');
    expect(csp).toContain("img-src 'self' data: blob: https://media.example.com;");
    expect(csp).toContain("media-src 'self' https://media.example.com;");
    expect(csp).toContain("default-src 'self';");
    expect(nextConfig.images?.remotePatterns).toEqual([
      { protocol: 'https', hostname: 'media.example.com', port: '', pathname: '/**' },
    ]);
  });

  it('ignores a value that is not a bare host', async () => {
    const { nextConfig, csp } = await loadConfig('https://media.example.com/path');
    expect(csp).not.toContain('media.example.com');
    expect(nextConfig.images?.remotePatterns).toEqual([]);
  });
});
