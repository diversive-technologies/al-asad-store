import type { NextConfig } from 'next';

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
 * NEXT-09: remote image hosts are declared here as `remotePatterns` when the
 * CDN origin is known. `images.domains` is deprecated and PROHIBITED.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
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
  /**
   * D1: MSW and its interceptors are resolved by Node at runtime rather than
   * bundled. They rely on subpath exports the bundler cannot statically
   * resolve, and they must never be traced into the edge runtime. Removing
   * these entries once the Java service replaces the mock layer is expected.
   */
  /*
   * Serve AVIF where the browser accepts it, WebP otherwise. The source assets
   * are already AVIF, but next/image re-encodes per requested width, so the
   * output format has to be stated here or it falls back to WebP only.
   */
  images: { formats: ['image/avif', 'image/webp'] },
  // Omitted entirely when unset, so the default (block everything) still holds.
  ...(devAllowedOrigins.length > 0 ? { allowedDevOrigins: devAllowedOrigins } : {}),
  serverExternalPackages: ['msw', '@mswjs/interceptors'],
};

export default nextConfig;
