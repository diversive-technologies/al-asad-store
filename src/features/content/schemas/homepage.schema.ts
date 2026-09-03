import { z } from 'zod';

import { productCardSchema } from '@/features/catalogue';

/**
 * SSOT-09 — the wire contract for `ContentQuery.homepage(locale)` (section 21).
 *
 * The homepage is editorial configuration, not code: section 28.4 requires a
 * video and four sections but never says which four, because the operator
 * chooses them. The frontend therefore renders section *kinds*, and reordering,
 * removing or adding an instance is a content change rather than a deploy. Only
 * a genuinely new kind of section needs frontend work.
 *
 * `kind` is declared by the backend and switched on exhaustively — never
 * inferred from which fields happen to be present.
 */
const ctaSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

export type Cta = z.infer<typeof ctaSchema>;

/**
 * Section 30.1: the homepage video never blocks first render. The poster is
 * mandatory and the video is not — an unset `videoUrl` is a valid, renderable
 * state showing the still alone, which is also what ships before the film
 * exists.
 */
/**
 * One asset per colour scheme. A film graded for a dark page looks wrong on a
 * light one, so the scheme is part of the asset's identity rather than a filter
 * applied over a single file.
 */
const themedAssetSchema = z.object({
  light: z.string().min(1),
  dark: z.string().min(1),
});

export type ThemedAsset = z.infer<typeof themedAssetSchema>;

const heroVideoSectionSchema = z.object({
  kind: z.literal('HERO_VIDEO'),
  id: z.string().min(1),
  poster: themedAssetSchema,
  video: themedAssetSchema.nullable(),
  headline: z.string().min(1),
  subheadline: z.string().min(1),
  cta: ctaSchema,
});

/** A collection-backed rail of product cards. */
const productRailSectionSchema = z.object({
  kind: z.literal('PRODUCT_RAIL'),
  id: z.string().min(1),
  title: z.string().min(1),
  collectionSlug: z.string().min(1),
  products: z.array(productCardSchema),
  viewAllHref: z.string().min(1),
});

/** Tiles into filtered catalogue views. */
const categoryGridSectionSchema = z.object({
  kind: z.literal('CATEGORY_GRID'),
  id: z.string().min(1),
  title: z.string().min(1),
  tiles: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      imageUrl: z.string().min(1),
      href: z.string().min(1),
    }),
  ),
});

/**
 * Image beside copy. `imageSide` is deliberately logical (`start`/`end`) rather
 * than `left`/`right`: a physical value would place the image on the wrong side
 * of every Urdu render, and the operator would have to maintain two settings
 * that mean the same thing (I18N-04).
 */
const editorialBannerSectionSchema = z.object({
  kind: z.literal('EDITORIAL_BANNER'),
  id: z.string().min(1),
  heading: z.string().min(1),
  body: z.string().min(1),
  imageUrl: z.string().min(1),
  imageSide: z.enum(['start', 'end']),
  cta: ctaSchema,
});

export const homepageSectionSchema = z.discriminatedUnion('kind', [
  heroVideoSectionSchema,
  productRailSectionSchema,
  categoryGridSectionSchema,
  editorialBannerSectionSchema,
]);

export type HomepageSection = z.infer<typeof homepageSectionSchema>;
export type HeroVideoSection = z.infer<typeof heroVideoSectionSchema>;
export type ProductRailSection = z.infer<typeof productRailSectionSchema>;
export type CategoryGridSection = z.infer<typeof categoryGridSectionSchema>;
export type EditorialBannerSection = z.infer<typeof editorialBannerSectionSchema>;

export const homepageSchema = z.object({
  sections: z.array(homepageSectionSchema),
});

export type Homepage = z.infer<typeof homepageSchema>;
