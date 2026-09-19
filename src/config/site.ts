import { clientEnv } from './env.client';

/**
 * NEXT-11 — metadata defaults that are NOT user-visible copy.
 *
 * The app name and description deliberately do not live here: both are
 * translated (the store is "Al-Asad" in English and "الاسد" in Urdu), which
 * makes them copy, and copy has exactly one home — the message registry
 * (SSOT-07). Holding a second English-only copy here is what produced an Urdu
 * page titled with an English brand name.
 */
export const SITE = {
  /** Resolves relative URLs in metadata, including the hreflang alternates. */
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_APP_URL),
} as const;

/**
 * A path from `ROUTES` as the full address a person can paste somewhere else —
 * a WhatsApp message, a copied link — resolved against the same base the
 * metadata's canonical addresses are, so a shared link and the canonical one are
 * the same string.
 */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE.metadataBase).href;
}
