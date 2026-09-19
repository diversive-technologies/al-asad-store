import type { ReactNode } from 'react';

import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { JsonLd } from '@/components/shared/JsonLd';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { productStructuredData } from '../lib/product-structured-data';
import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { ProductDetail } from '../schemas/product-detail.schema';
import { FabricCalculator } from './FabricCalculator';
import { ProductFabricNotes } from './ProductFabricNotes';
import { ProductGallery } from './ProductGallery';
import { ProductIncluded } from './ProductIncluded';
import { ProductInfoSections } from './ProductInfoSections';
import { ProductSummary } from './ProductSummary';
import { RelatedProducts } from './RelatedProducts';

export interface ProductScreenProps {
  product: ProductDetail;
  availability: ProductDetailAvailability | null;
  locale: Locale;
  messages: Messages;
  /**
   * Architecture §24's try-on entry, or nothing.
   *
   * A SLOT rather than an import, because MOD-01 does not let one feature reach
   * into another: the route composes the two. It is the same arrangement the
   * header uses for the search field, and for the same reason.
   */
  tryOn?: ReactNode;
  /**
   * §28.2's size guide — §21's content, rendered by the Content feature and opened
   * beside the size selectors. A slot for the same reason as `tryOn`.
   */
  sizeGuide?: ReactNode;
}

/**
 * §28.2's product page: ONE route and ONE shell for every product.
 *
 * The buy box is the only thing that branches, and it branches on the declared
 * `product_type`. Everything here — gallery, description, pieces, fabric, care,
 * delivery — is the same for a cap and for a three-piece suit, which is exactly
 * what "one route, one shell, a branching buy box" means.
 *
 * A Server Component with client leaves (`ProductGallery`, `ProductBuyBox`,
 * `FabricCalculator`, and the copy-link button in `ProductShare`). The copy, the
 * pricing, the pieces and the fabric notes are all server-rendered and crawlable
 * (§30.5). "You may also like" streams in last, behind its own `<Suspense>`, so
 * nothing above it waits for it (`RelatedProducts`).
 *
 * `grid-cols-1` is load-bearing, not decoration. Left implicit, the single column
 * below 1024px is an AUTO track, which is sized to its contents and cannot
 * shrink under them — so the gallery's thumbnail strip (432px of max-content,
 * which its own `overflow-x-auto` could not absorb, because an auto track
 * measures a scroller's contents rather than the scroller) laid every phone's
 * page out 432px wide. `minmax(0, 1fr)` is a definite track that fills the shell
 * and is allowed to be narrower than its contents.
 */
export function ProductScreen({
  product,
  availability,
  locale,
  messages,
  tryOn = null,
  sizeGuide = null,
}: ProductScreenProps) {
  const tc = messages.catalogue;

  return (
    <div className="page-shell py-10">
      {/* §30.5 — from the same projection and the same live verdict the buy box shows. */}
      <JsonLd data={productStructuredData(product, availability, messages.site.name)} />
      <Breadcrumbs
        label={messages.common.breadcrumbLabel}
        steps={[
          { label: tc.breadcrumbHome, href: ROUTES.home },
          { label: tc.title, href: ROUTES.catalogue.list },
          { label: product.name },
        ]}
        className="mb-6"
        canonicalPath={ROUTES.catalogue.detail(product.slug)}
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
        <ProductGallery
          media={product.media}
          productName={product.name}
          locale={locale}
          messages={messages}
        />
        <ProductSummary
          product={product}
          availability={availability}
          locale={locale}
          messages={messages}
          tryOn={tryOn}
          sizeGuide={sizeGuide}
        />
      </div>

      {/*
       * §25 — drawn only when the BACKEND offers it. `null` is the eligibility
       * answer ("at least one unstitched piece"), so nothing here inspects the
       * pieces to decide (DATA-13).
       */}
      {product.fabricCalculator === null ? null : (
        <div className="mt-12">
          <FabricCalculator
            productId={product.id}
            offer={product.fabricCalculator}
            locale={locale}
            messages={messages}
          />
        </div>
      )}

      {/* A11Y-09: sequential headings under the single h1 in the summary. */}
      <ProductIncluded pieces={product.pieces} locale={locale} messages={messages} />
      <ProductFabricNotes pieces={product.pieces} messages={messages} />
      <ProductInfoSections sections={product.infoSections} messages={messages} />
      <RelatedProducts productId={product.id} locale={locale} messages={messages} />
    </div>
  );
}
