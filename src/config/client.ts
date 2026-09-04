/**
 * D5 — THE client profile. The one file that differs between deployments.
 *
 * This storefront is a product delivered per client, not a bespoke site and not
 * a multi-tenant application. One codebase, one deployment per client, and every
 * difference resolved at build time. Each deployment therefore still serves ONE
 * market in ONE currency from ONE warehouse, exactly as `DATA-11a` and
 * architecture §1.3 require — what varies is which market, not how many.
 *
 * ## Onboarding a new client
 *
 * 1. This file — market, formatting, and which optional features are on.
 * 2. `src/styles/globals.css` `@theme` — colour, radius, spacing, type scale.
 * 3. `src/i18n/messages/*` — every user-visible string, including the store name.
 * 4. `src/i18n/locales.ts` — which languages, and the default.
 * 5. `src/config/fonts.ts` — the two typefaces.
 * 6. Backend content — products, imagery, homepage composition, help pages.
 *
 * Nothing else should need touching. A component that hard-codes anything on
 * that list is a defect, not a shortcut.
 *
 * ## What does NOT belong here
 *
 * The apparel domain. `SIMPLE`/`SET`, per-piece sizing, unstitched metreage and
 * the fabric vocabularies are the PRODUCT, not the client — a second ethnic
 * apparel retailer wants all of it, and a furniture retailer is a different
 * product rather than a customisation. Generalising the domain layer in the name
 * of configurability would build an abstraction with exactly one real user.
 *
 * Secrets and per-environment URLs do not belong here either; those are
 * `SSOT-03` env, validated in `env.server.ts` / `env.client.ts`.
 */

/** Supported currencies, as an `as const` union rather than an enum (TS-10). */
const CURRENCIES = {
  PKR: { code: 'PKR', minorUnitsPerMajor: 100 },
  INR: { code: 'INR', minorUnitsPerMajor: 100 },
  AED: { code: 'AED', minorUnitsPerMajor: 100 },
  USD: { code: 'USD', minorUnitsPerMajor: 100 },
  GBP: { code: 'GBP', minorUnitsPerMajor: 100 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export interface MarketProfile {
  /**
   * DATA-11a: ONE currency for this deployment. This is a build-time choice, not
   * a runtime selector — offering the customer a currency menu would model a
   * market structure that does not exist.
   */
  readonly currency: (typeof CURRENCIES)[CurrencyCode];
  /**
   * BCP-47 tag per locale, used for every `Intl` call.
   *
   * The region matters as much as the language, and getting it wrong is not
   * cosmetic: `ur-PK` resolves to Latin digits while `ur-IN` resolves to Eastern
   * Arabic-Indic, so the same Urdu string renders `123` for one market and `۱۲۳`
   * for another. Keyed by locale so a client adding a language adds one entry.
   */
  readonly formatting: Readonly<Record<string, string>>;
  /**
   * The national mobile-number format, for the sign-in and checkout fields.
   *
   * A pattern rather than a library: this system collects one country's numbers,
   * and a full international parser would be a dependency earning its keep on a
   * single field. `example` is shown as the placeholder, so the two cannot drift.
   */
  readonly mobile: {
    readonly pattern: RegExp;
    readonly example: string;
  };
}

/**
 * Optional features, per client.
 *
 * Flags are added when a feature actually becomes optional — never speculatively
 * (PD-05). A flag with nothing reading it is dead configuration that still has
 * to be understood by the next person.
 */
export interface FeatureProfile {
  /** §28.4 newsletter capture in the footer. */
  readonly newsletter: boolean;
  /**
   * The light/dark toggle. A client with a single brand treatment may want the
   * store to render one way only; the tokens still define both schemes, so this
   * removes the control rather than the capability.
   */
  readonly themeToggle: boolean;
}

export interface ClientProfile {
  readonly market: MarketProfile;
  readonly features: FeatureProfile;
}

export const CLIENT: ClientProfile = {
  market: {
    currency: CURRENCIES.PKR,
    formatting: { en: 'en-PK', ur: 'ur-PK' },
    mobile: {
      // Pakistani mobile numbers: 03xx xxxxxxx, with optional spaces or dashes.
      pattern: /^03\d{2}[\s-]?\d{7}$/,
      example: '03xx xxxxxxx',
    },
  },
  features: {
    newsletter: true,
    themeToggle: true,
  },
};
