import Image from 'next/image';

export interface StudioProductPhotoProps {
  readonly src: string;
  readonly alt: string;
}

/**
 * The garment's photograph in `StudioProductBanner`. Its own module so that
 * `next/image` is downloaded only when the studio was opened from a product —
 * the banner has the reasoning. Rendered inside the studio's client boundary,
 * so it needs no directive (MOD-06).
 *
 * A11Y-04: the alt text is the operator's, and it is `aria-hidden` here because
 * the banner's link already names the garment in words — a screen reader would
 * otherwise hear the product twice in one control.
 */
export function StudioProductPhoto({ src, alt }: StudioProductPhotoProps) {
  return (
    <Image aria-hidden src={src} alt={alt} width={64} height={80} className="mm-product-photo" />
  );
}
