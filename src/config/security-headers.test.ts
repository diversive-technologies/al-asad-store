import { describe, expect, it } from 'vitest';

import nextConfig from '../../next.config';

describe('Security headers configuration', () => {
  it('disables the powered-by header', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it('declares headers for every path', async () => {
    expect(typeof nextConfig.headers).toBe('function');
    const headerEntries = (await nextConfig.headers?.()) ?? [];
    expect(headerEntries.length).toBeGreaterThan(0);

    const catchAll = headerEntries.find((entry) => entry.source === '/:path*');
    expect(catchAll).toBeDefined();

    const headersMap = new Map(catchAll?.headers.map((h) => [h.key, h.value]));

    // Strict-Transport-Security
    expect(headersMap.get('Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains; preload',
    );

    // X-Content-Type-Options
    expect(headersMap.get('X-Content-Type-Options')).toBe('nosniff');

    // Referrer-Policy
    expect(headersMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');

    // X-Frame-Options
    expect(headersMap.get('X-Frame-Options')).toBe('DENY');

    // Permissions-Policy
    expect(headersMap.get('Permissions-Policy')).toBe(
      'camera=(), microphone=(), geolocation=(), payment=()',
    );

    // Content-Security-Policy
    const csp = headersMap.get('Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain('img-src \'self\' data: blob:');
    expect(csp).toContain("media-src 'self'");
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
  });
});
