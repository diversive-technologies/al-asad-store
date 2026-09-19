import type { ComponentType } from 'react';

import dynamic from 'next/dynamic';
import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import { useMessages } from '@/i18n/use-messages';
import { ChevronRight } from '@/lib/vendor/icons';

import type { StudioProduct } from '../lib/studio-product';
import type { StudioProductPhotoProps } from './StudioProductPhoto';

type PhotoComponent = ComponentType<StudioProductPhotoProps>;

/* The photo's own box, empty: while its code downloads, and if it cannot be. */
function PhotoBox() {
  return <span aria-hidden className="mm-product-photo" />;
}

/*
 * Deliberate code split (IMP-01a, PERF-06, PERF-10): this photograph is the
 * only thing on the studio's first paint drawn with `next/image`, and it is
 * drawn only when a product sent the customer here — so a plain visit carried
 * the image component for nothing. It is still rendered on the server (`ssr`
 * stays on), so the photo is in the page's HTML and its code is preloaded with
 * it; arriving from a product by a client navigation, the photo's own box holds
 * its place until it lands, as it did while the image itself was loading.
 *
 * `next/dynamic` rather than `onDemandPart`, because only it renders on the
 * server. Its lazy component throws when the download fails, which would take
 * the studio down with it, so the loader never rejects (DATA-03): a photo that
 * cannot be downloaded leaves its box empty, and the name and the way back to
 * the garment still stand.
 */
const StudioProductPhoto = dynamic(
  () =>
    import('./StudioProductPhoto').then<PhotoComponent, PhotoComponent>(
      (module) => module.StudioProductPhoto,
      () => PhotoBox,
    ),
  { loading: PhotoBox },
);

export interface StudioProductBannerProps {
  readonly product: StudioProduct;
}

/**
 * §34 — which garment these measurements are being taken for.
 *
 * A customer arrives here from one product's buy box and then spends several
 * minutes with a tape measure. The page they are on says "Your measurements" and
 * draws a generic kameez, so without this there is nothing on screen connecting
 * the work to the waistcoat they were looking at — and nothing to get back to it
 * with, short of the browser's own Back.
 *
 * The PHOTOGRAPH is the load-bearing part, not the name. Two of this store's
 * garments share a name and differ only in cloth, so a customer who opened the
 * fork from the wrong tile would read the right words and measure for the wrong
 * product. One look at the picture settles it.
 *
 * The whole block is one link (A11Y-01), so it is a generous target on a phone
 * and reads to a screen reader as one sentence rather than a picture, a line of
 * text and a detached "go".
 */
export function StudioProductBanner({ product }: StudioProductBannerProps) {
  const t = useMessages().madeToMeasure;

  return (
    <Link href={ROUTES.catalogue.detail(product.slug)} className="mm-product group">
      <StudioProductPhoto src={product.imageUrl} alt={product.imageAlt} />
      <span className="flex flex-col items-start gap-0.5">
        <span className="text-fg-muted text-xs">{t.productFor}</span>
        <span className="text-fg text-sm font-medium">{product.name}</span>
        <span className="text-fg-muted mt-0.5 inline-flex items-center gap-1 text-xs underline decoration-1 underline-offset-4">
          {t.productBack}
          {/* I18N-05: directional, so it mirrors under RTL. */}
          <ChevronRight aria-hidden className="size-3.5 rtl:rotate-180" />
        </span>
      </span>
    </Link>
  );
}
