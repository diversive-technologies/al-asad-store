import type { NextConfig } from 'next';

/**
 * NEXT-09: remote image hosts are declared here as `remotePatterns` when the
 * CDN origin is known. `images.domains` is deprecated and PROHIBITED.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  /**
   * D1: MSW and its interceptors are resolved by Node at runtime rather than
   * bundled. They rely on subpath exports the bundler cannot statically
   * resolve, and they must never be traced into the edge runtime. Removing
   * these entries once the Java service replaces the mock layer is expected.
   */
  serverExternalPackages: ['msw', '@mswjs/interceptors'],
};

export default nextConfig;
