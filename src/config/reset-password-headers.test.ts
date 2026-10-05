import { describe, expect, it } from 'vitest';

import nextConfig from '../../next.config';

/**
 * F-03 — the reset page's address carries a one-time token, so the page sends
 * `Referrer-Policy: no-referrer`. Next lets the LAST rule win when two set one
 * header, so the path's own rule has to come after the catch-all's.
 */
describe('the reset page’s referrer policy', () => {
  it('is no-referrer for /reset-password, declared after the site-wide rule', async () => {
    const entries = (await nextConfig.headers?.()) ?? [];
    const catchAll = entries.findIndex((entry) => entry.source === '/:path*');
    const reset = entries.findIndex((entry) => entry.source === '/reset-password');

    expect(reset).toBeGreaterThan(catchAll);
    expect(entries[reset]?.headers).toContainEqual({
      key: 'Referrer-Policy',
      value: 'no-referrer',
    });
  });
});
