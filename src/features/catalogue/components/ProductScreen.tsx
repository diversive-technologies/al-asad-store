import type { ReactNode } from 'react';

import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatDate, formatMetres, formatNumber, formatTemplate } from '@/lib/utils/format';

import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { ProductDetail } from '../schemas/product-detail.schema';
import { FabricCalculator } from './FabricCalculator';
import { ProductBuyBox } from './ProductBuyBox';
import { ProductGallery } from './ProductGallery';

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
   *
   * Null when the backend reports no provider — the feature is then absent
   * rather than present-and-broken, which is what ADR 12 asks for. Nothing on
   * this page depends on it either way.
   */
  tryOn?: ReactNode;
}

/**
 * §28.2's product page: ONE route and ONE shell for every product.
 *
 * The buy box is the only thing that branches, and it branches on the declared
 * `product_type`. Everything here — gallery, description, pieces, fabric, care,
 * delivery — is the same for a cap and for a three-piece suit, which is exactly
 * what "one route, one shell, a branching buy box" means.
 *
 * A Server Component with two client leaves (`ProductGallery`, `ProductBuyBox`).
 * The copy, the pricing, the pieces and the fabric notes are all server-rendered
 * and crawlable (§30.5).
 */
export function ProductScreen({
  product,
  availability,
  locale,
  messages,
  tryOn = null,
}: ProductScreenProps) {
  const t = messages.product;
  const tc = messages.catalogue;

  // §6.3 — care text is held against the fabric, so a product with pieces in
  // two fabrics has two care notes. De-duplicated by fabric id, not by text.
  const fabrics = [
    ...new Map(product.pieces.map((piece) => [piece.fabric.id, piece.fabric])).values(),
  ];

  return (
    <div className="page-shell py-10">
      <nav aria-label={tc.title} className="text-fg-muted mb-6 text-sm">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href={ROUTES.home} className="hover:text-fg">
              {tc.breadcrumbHome}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={ROUTES.catalogue.list} className="hover:text-fg">
              {tc.title}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-fg">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <ProductGallery media={product.media} productName={product.name} messages={messages} />

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-fg text-2xl font-semibold">{product.name}</h1>
            <p className="text-fg-muted">{product.description}</p>
            <p className="text-fg-muted text-xs">
              {t.codeLabel}: <bdi>{product.code}</bdi>
            </p>
          </div>

          <ProductBuyBox
            product={product}
            availability={availability}
            locale={locale}
            messages={messages}
          />

          {tryOn}

          <dl className="border-border text-fg-muted flex flex-col gap-2 border-t pt-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <dt className="text-fg font-medium">{t.estimatedDelivery}</dt>
              {/* I18N-08 / DATA-12: an ISO date from the backend, formatted here. */}
              <dd>
                <bdi>{formatDate(product.estimatedDeliveryDate, locale)}</bdi>
              </dd>
            </div>

            {product.model === null ? null : (
              <div>
                <dt className="sr-only">{t.selectSizeHeading}</dt>
                {/* I18N-06: one parameterised sentence, never concatenated parts. */}
                <dd>
                  {formatTemplate(t.modelNote, {
                    height: formatNumber(product.model.heightCm, locale),
                    size: product.model.sizeWorn,
                  })}
                </dd>
              </div>
            )}
          </dl>
        </div>
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

      {/* A11Y-09: sequential headings under the single h1 above. */}
      <section aria-labelledby="included-heading" className="mt-12">
        <h2 id="included-heading" className="text-fg mb-4 text-lg font-medium">
          {t.includedHeading}
        </h2>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {product.pieces.map((piece) => (
            <li key={piece.id} className="rounded-card bg-surface-muted flex flex-col gap-1 p-4">
              <h3 className="text-fg text-sm font-medium">{piece.name}</h3>
              <p className="text-fg-muted text-sm">
                {piece.fabric.name}
                <span aria-hidden> · </span>
                {piece.colour.displayName}
              </p>
              <p className="text-fg-muted text-xs">{piece.colour.description}</p>
              {piece.lengthMetres === null ? null : (
                <p className="text-fg-muted text-xs">
                  {t.lengthLabel}: <bdi>{formatMetres(piece.lengthMetres, locale)}</bdi>
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="fabric-heading" className="mt-12">
        <h2 id="fabric-heading" className="text-fg mb-4 text-lg font-medium">
          {t.fabricLabel}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {fabrics.map((fabric) => (
            <div key={fabric.id} className="flex flex-col gap-1">
              <h3 className="text-fg text-sm font-medium">{fabric.name}</h3>
              <p className="text-fg-muted text-sm">{fabric.explainer}</p>
              <p className="text-fg-muted text-sm">
                <span className="text-fg">{t.careLabel}: </span>
                {fabric.careText}
              </p>
            </div>
          ))}
        </div>
      </section>

      {product.infoSections.length === 0 ? null : (
        <section aria-labelledby="info-heading" className="mt-12">
          <h2 id="info-heading" className="sr-only">
            {tc.title}
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {product.infoSections.map((info) => (
              <div key={info.id} className="flex flex-col gap-1">
                <h3 className="text-fg text-sm font-medium">{info.heading}</h3>
                <p className="text-fg-muted text-sm">{info.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
