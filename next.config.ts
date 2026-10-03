import type { NextConfig } from 'next';

import { MEDIA_WIDTHS, parseMediaHost } from './src/lib/media/media-host';

/**
 * Hosts allowed to request Next's own dev resources (`/_next/*`).
 *
 * Next blocks these cross-origin by default, which is why the store opened on a
 * phone over the LAN but nothing interactive worked: the HTML and the images
 * came back, every JavaScript chunk was refused, and a page with no client
 * JavaScript still navigates — `<Link>` degrades to a plain `<a>` — while search,
 * the bag panel and checkout, which need it, silently do nothing.
 *
 * It is read from the environment rather than written here because a LAN
 * address is MACHINE-LOCAL: it belongs to whoever is testing, it changes when
 * the router reissues the lease, and SEC-10 keeps internal hostnames out of
 * committed code. `.env.local` is gitignored; `.env.example` documents it.
 *
 * This is a development-only control. It has no effect on a production build.
 */
const devAllowedOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

/**
 * R-03: the CDN host product media is served from, or null. Read here for the
 * Content-Security-Policy and `remotePatterns`; `env.client.ts` validates the
 * same variable at boot with the same parser.
 */
const mediaHost = parseMediaHost(process.env.NEXT_PUBLIC_MEDIA_HOST);

/**
 * F-07: Security headers and CSP configuration.
 */
function buildContentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
  const connectSrc = isDev ? "'self' ws:" : "'self'";

  const mediaOrigin = mediaHost === null ? '' : ` https://${mediaHost}`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${mediaOrigin}`,
    `media-src 'self'${mediaOrigin}`,
    "font-src 'self'",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/**
 * NEXT-09: remote image hosts are declared here as `remotePatterns`.
 * `images.domains` is deprecated and PROHIBITED. Only the media host is ever
 * allowed, and only when it is configured.
 */
const mediaRemotePatterns = (() => {
  if (mediaHost === null) return [];
  const [hostname = '', port = ''] = mediaHost.split(':');
  return [{ protocol: 'https' as const, hostname, port, pathname: '/**' }];
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * `typedRoutes` is deliberately OFF.
   *
   * It requires every `href` to be a statically known route literal, but this
   * storefront is content-driven: section 21 lets the operator configure
   * homepage CTAs, category tiles and banner links, so those hrefs are runtime
   * strings the compiler cannot possibly verify. Satisfying the flag would mean
   * casting them, which TS-03 prohibits — trading a real rule for a synthetic
   * one.
   *
   * The protection it offers is already covered from the other direction:
   * SSOT-02 makes `ROUTES` the only source of internal paths, so a typo has one
   * place to live rather than being scattered across call sites.
   */
  typedRoutes: false,
  /*
   * R-03 — media is served by the CDN at three pre-built widths and the loader
   * picks one itself (`src/lib/media/image-loader.ts`), so Vercel's image
   * optimiser is not in the path. Local fixture images in `public/` pass through
   * the loader unchanged. `remotePatterns` still names the media host, and only
   * that host, so a stray `loader` prop or a future switch back to the built-in
   * optimiser cannot be pointed at any other origin.
   */
  images: {
    loader: 'custom',
    loaderFile: './src/lib/media/image-loader.ts',
    /*
     * The widths a `srcset` offers ARE the three the CDN holds, so the browser
     * chooses between real files rather than between descriptors that the loader
     * then rounds. `imageSizes` stays at Next's default for small thumbnails.
     */
    deviceSizes: [...MEDIA_WIDTHS],
    remotePatterns: mediaRemotePatterns,
  },
  /**
   * §24 Try-On reads the garment's photograph off the FILESYSTEM —
   * `garmentImage` in `src/features/try-on/api/try-on-images.ts` joins
   * `process.cwd()/public/<mediaUrl>` and hands the bytes to sharp.
   *
   * On a serverless host `public/` is uploaded to the CDN and is NOT traced
   * into the function bundle, because nothing the tracer can see imports it —
   * the path is composed at runtime from a catalogue record. So `readFile`
   * throws, `garmentImage` returns null, and every try-on answers
   * `UNAVAILABLE / PROVIDER_FAILED`. It works locally and fails deployed,
   * which is the worst shape a fault can take.
   *
   * Declared against the Route Handler that needs it. 5.4 MB of AVIF, far
   * inside the function size ceiling. R-04: a garment on the media host is
   * FETCHED instead, so this goes when the CDN is the only source — see
   * `.claude/working-docs/try-on-module.md`.
   */
  outputFileTracingIncludes: { '/api/try-on': ['./public/products/**'] },
  // Omitted entirely when unset, so the default (block everything) still holds.
  ...(devAllowedOrigins.length > 0 ? { allowedDevOrigins: devAllowedOrigins } : {}),

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Content-Security-Policy',
            value: buildContentSecurityPolicy(),
          },
        ],
      },
      /*
       * F-03 — the password-reset page's address carries a one-time token. The
       * site-wide policy sends the origin to other sites; this path sends nothing.
       * Declared AFTER the catch-all: when two rules set the same header the last
       * one wins.
       */
      {
        source: '/reset-password',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
    ];
  },
};

export default nextConfig;
