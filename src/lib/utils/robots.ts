import { ROUTES } from '@/config/routes';
import { absoluteUrl } from '@/config/site';

/**
 * §30.5 — what a crawler is asked to leave alone, as data. `app/robots.ts`
 * returns it; `robots.test.ts` holds it to the pages' own `noindex` decisions.
 *
 * These are exactly the pages that already say `index: false` in their metadata,
 * plus the BFF, which serves JSON rather than pages. A crawler has no bag, no
 * account and no order of its own, so crawling them only spends its budget on
 * sign-in prompts and empty states. Each entry is a PREFIX, as robots.txt reads
 * one: `/account` covers the address book beneath it, `/sign-in` the variant that
 * remembers where the customer came from.
 *
 * The trade-off, stated rather than hidden: a crawler that is not allowed to
 * fetch a page cannot read that page's `noindex` either, so a well-linked one can
 * still appear in results as a bare address. The two together are the usual shop
 * arrangement, and the `noindex` stays as the answer for any crawler that
 * ignores this file.
 */
export const CRAWL_EXCLUDED_PATHS: readonly string[] = [
  ROUTES.apiPrefix,
  ROUTES.account,
  ROUTES.bag,
  ROUTES.checkout,
  ROUTES.orderPrefix,
  ROUTES.signIn,
  ROUTES.signUp,
  ROUTES.forgotPassword,
  ROUTES.wishlist,
];

/** The shape Next's `MetadataRoute.Robots` takes, stated without importing Next. */
export interface RobotsRules {
  readonly rules: {
    readonly userAgent: string;
    readonly allow: string;
    /** A fresh array, since Next's type is mutable and the list above is not. */
    readonly disallow: string[];
  };
  readonly sitemap: string;
}

/** Every crawler may read the public store, none the excluded paths; the sitemap is named. */
export function robotsRules(): RobotsRules {
  return {
    rules: { userAgent: '*', allow: ROUTES.home, disallow: [...CRAWL_EXCLUDED_PATHS] },
    sitemap: absoluteUrl(ROUTES.sitemap),
  };
}
