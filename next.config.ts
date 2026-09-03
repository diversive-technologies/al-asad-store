import type { NextConfig } from 'next';

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
  serverExternalPackages: ['msw', '@mswjs/interceptors'],
};

export default nextConfig;
