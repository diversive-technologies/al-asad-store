import { mediaAddressForWidth, parseMediaHost } from './media-host';

/*
 * Read straight from `process.env`, which SSOT-03 otherwise reserves to
 * `src/config/env.*.ts` — deliberately. `env.client.ts` validates with Zod, and
 * this module is in the first load of EVERY page that draws a photograph, so
 * importing it would put Zod in all of them (measured: +85 kB gzipped on the
 * catalogue, PERF-10 allows 200). The variable is still validated at boot by
 * `env.client.ts` with the same `parseMediaHost`; this is a second read of a
 * value that file has already vouched for, inlined at build time like any
 * `NEXT_PUBLIC_*`.
 */
const mediaHost = parseMediaHost(process.env.NEXT_PUBLIC_MEDIA_HOST);

/**
 * R-03 — the image loader for every `next/image` in the storefront
 * (`images.loader: 'custom'` in `next.config.ts`).
 *
 * Product photographs are uploaded at three widths and the file name carries the
 * width, so the CDN already holds every size the page can ask for: this swaps the
 * width in the name for the smallest bucket that covers the request and Vercel's
 * image optimiser never sees media. Everything else (fixture images in `public/`,
 * the logo) is returned as it is.
 */
export default function mediaImageLoader({ src, width }: { src: string; width: number }): string {
  return mediaAddressForWidth(src, width, mediaHost);
}
